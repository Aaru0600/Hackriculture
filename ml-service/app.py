"""
HACKRICULTURE ML service (FastAPI).

    uvicorn app:app --host 127.0.0.1 --port 8001 --reload

Endpoints
  GET  /health                 liveness + which models are loaded
  GET  /model-info              yield model card  (or ?task=crop|irrigation)
  POST /predict/yield           crop-yield prediction (real-data core + agronomic adjust)
  POST /recommend/crops         top-N crop recommendation
  POST /recommend/irrigation    irrigation need + water depth + schedule

Only the Node/Express backend is expected to call this service.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.features import (
    CROPS, GROWTH_STAGES, INPUT_RANGES, SEASONS, SOIL_TYPES, STATES,
)
from src.predict import MODEL_PATH, predict_yield
from src.crops import CROP_INPUT_RANGES
from src.irrigation import IRR_INPUT_RANGES
from src.recommend_crop import MODEL_PATH as CROP_MODEL_PATH, recommend_crops
from src.recommend_irrigation import (
    MODEL_PATH as IRR_MODEL_PATH, recommend_irrigation,
)

load_dotenv()

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ML_ALLOWED_ORIGINS", "http://localhost:4000").split(",")
]

app = FastAPI(title="HACKRICULTURE ML service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _rng(name: str) -> dict:
    lo, hi = INPUT_RANGES[name]
    return {"ge": lo, "le": hi}


def _crng(name: str) -> dict:
    lo, hi = CROP_INPUT_RANGES[name]
    return {"ge": lo, "le": hi}


def _irng(name: str) -> dict:
    lo, hi = IRR_INPUT_RANGES[name]
    return {"ge": lo, "le": hi}


class YieldRequest(BaseModel):
    # --- real-data model inputs ---
    crop: str = Field(..., description=f"one of {CROPS}")
    state: str = Field(..., description="Indian state (lower-case)")
    season: str = Field(..., description=f"one of {SEASONS}")
    farm_size_ha: float = Field(..., **_rng("farm_size_ha"))
    crop_year: int | None = Field(None, ge=1990, le=2035)
    annual_rainfall_mm: float | None = Field(None, **_rng("annual_rainfall_mm"))
    fertilizer_per_ha: float | None = Field(None, **_rng("fertilizer_per_ha"))
    pesticide_per_ha: float | None = Field(None, **_rng("pesticide_per_ha"))

    # --- optional agronomic adjustment inputs ---
    soil_type: str | None = None
    growth_stage: str | None = None
    nitrogen: float | None = Field(None, **_rng("nitrogen"))
    phosphorus: float | None = Field(None, **_rng("phosphorus"))
    potassium: float | None = Field(None, **_rng("potassium"))
    ph: float | None = Field(None, **_rng("ph"))
    temperature: float | None = Field(None, **_rng("temperature"))
    humidity: float | None = Field(None, **_rng("humidity"))
    sow_month: int | None = Field(None, ge=1, le=12)
    previous_yield: float | None = None  # stored by the backend, not used here

    def normalised(self) -> dict:
        data = self.model_dump()
        data["area_ha"] = data["farm_size_ha"]
        checks = [("crop", CROPS), ("season", SEASONS), ("state", STATES)]
        if data.get("soil_type") is not None:
            checks.append(("soil_type", SOIL_TYPES))
        if data.get("growth_stage") is not None:
            checks.append(("growth_stage", GROWTH_STAGES))
        for key, allowed in checks:
            data[key] = str(data[key]).lower().strip()
            if data[key] not in allowed:
                raise HTTPException(
                    status_code=422,
                    detail=f"{key} must be one of {allowed}, got '{data[key]}'",
                )
        return data


class Factor(BaseModel):
    feature: str
    label: str
    source: str
    impact_t_ha: float
    direction: str


class AdjustmentPart(BaseModel):
    input: str
    label: str
    multiplier: float
    direction: str


class CurvePoint(BaseModel):
    x: float
    yield_t_ha: float


class YieldResponse(BaseModel):
    predicted_yield_t_ha: float
    core_yield_t_ha: float
    adjustment_factor: float
    adjustment_inputs_used: list[str]
    adjustment_detail: list[AdjustmentPart]
    yield_range_t_ha: list[float]
    expected_production_t: float | None
    prediction_quality: int
    prediction_quality_note: str
    risk_level: str
    influencing_factors: list[Factor]
    response_curves: dict[str, list[CurvePoint]]
    reference_yield_t_ha: float
    model_source: str
    model_version: str
    generated_at: str


# --- crop recommendation ---------------------------------------------------

class CropRecRequest(BaseModel):
    nitrogen: float = Field(..., **_crng("nitrogen"))
    phosphorus: float = Field(..., **_crng("phosphorus"))
    potassium: float = Field(..., **_crng("potassium"))
    temperature: float = Field(..., **_crng("temperature"))
    humidity: float = Field(..., **_crng("humidity"))
    ph: float = Field(..., **_crng("ph"))
    rainfall: float = Field(..., **_crng("rainfall"))
    # accepted, not used by the model (dataset has no soil type / season)
    soil_type: str | None = None
    season: str | None = None
    top_n: int = Field(3, ge=1, le=6)


# --- irrigation recommendation -------------------------------------------------

class IrrigationRequest(BaseModel):
    crop: str
    soilType: str | None = None
    growthStage: str | None = None
    soilMoisture: float | None = Field(None, **_irng("soil_moisture"))
    temperature: float | None = Field(None, **_irng("temperature_c"))
    humidity: float | None = Field(None, **_irng("humidity"))
    rainfall: float | None = Field(None, **_irng("rainfall_mm"))
    forecastRainProbability: float | None = Field(None, **_irng("forecast_rain_probability"))
    farmSize: float | None = Field(None, gt=0)
    irrigationType: str | None = None


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "models": {
            "yield": MODEL_PATH.exists(),
            "crop": CROP_MODEL_PATH.exists(),
            "irrigation": IRR_MODEL_PATH.exists(),
        },
    }


@app.get("/model-info")
def model_info(task: str = "yield") -> dict:
    name = {
        "yield": "model_card.json",
        "crop": "crop_model_card.json",
        "irrigation": "irrigation_model_card.json",
    }.get(task)
    if name is None:
        raise HTTPException(status_code=400, detail="task must be yield|crop|irrigation")
    card = MODEL_PATH.with_name(name)
    if not card.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found - train the {task} model")
    return json.loads(Path(card).read_text())


@app.post("/predict/yield", response_model=YieldResponse)
def predict_yield_endpoint(req: YieldRequest) -> dict:
    return predict_yield(req.normalised())


@app.post("/recommend/crops")
def recommend_crops_endpoint(req: CropRecRequest) -> dict:
    data = req.model_dump()
    top_n = data.pop("top_n", 3)
    try:
        return recommend_crops(data, top_n=top_n)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/recommend/irrigation")
def recommend_irrigation_endpoint(req: IrrigationRequest) -> dict:
    return recommend_irrigation(req.model_dump(exclude_none=True))
