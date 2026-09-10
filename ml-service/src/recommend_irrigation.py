"""
Irrigation-recommendation inference.

1. the RandomForest classifier predicts a Low / Medium / High irrigation-need
   class from the soil + weather + crop context (dataset features filled from
   card defaults where the caller omits them);
2. a transparent rule layer turns that class into a net water depth, a gross
   depth (adjusted for method efficiency and forecast rain), a "next
   irrigation" interval and an approximate run duration.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import pandas as pd
from joblib import load

from .irrigation import (
    DEFAULT_STAGE_WATER, IRR_FEATURE_ORDER, METHOD_EFFICIENCY,
    NEED_SCALE, NEXT_IRRIGATION_DAYS, STAGE_WATER_MM,
)

MODEL_PATH = Path("models/irrigation_model.joblib")
CARD_PATH = MODEL_PATH.with_name("irrigation_model_card.json")

# spec API field  ->  dataset feature
SPEC_TO_FEATURE = {
    "soilType": "soil_type",
    "soilMoisture": "soil_moisture",
    "temperature": "temperature_c",
    "humidity": "humidity",
    "rainfall": "rainfall_mm",
    "crop": "crop_type",
    "growthStage": "crop_growth_stage",
}


@lru_cache(maxsize=1)
def _card() -> dict:
    return json.loads(CARD_PATH.read_text()) if CARD_PATH.exists() else {}


@lru_cache(maxsize=1)
def _model():
    return load(MODEL_PATH) if MODEL_PATH.exists() else None


def _model_version() -> str:
    sha = str(_card().get("dataset", {}).get("sha256", ""))[:8]
    return f"irrigation-1.0-{sha}" if sha else "irrigation-1.0"


def _row(payload: dict) -> pd.DataFrame:
    d = _card().get("feature_defaults", {})
    mapped = {feat: payload[k] for k, feat in SPEC_TO_FEATURE.items() if payload.get(k) is not None}
    if payload.get("farmSize") is not None:
        mapped["field_area_hectare"] = payload["farmSize"]
    row = {c: mapped.get(c, d.get(c)) for c in IRR_FEATURE_ORDER}
    return pd.DataFrame([row])[IRR_FEATURE_ORDER]


def _moisture_override(payload: dict, need: str) -> tuple[str, str | None]:
    """The training data has only ~3% 'High' rows, so the classifier almost never
    predicts High and barely moves with soil moisture. Correct the label at the
    ends of the moisture range (dataset range is ~8-65%), and nudge a 'Low' up
    when it is hot and dry. Returns (need, reason-or-None).
    """
    m = payload.get("soilMoisture")
    t = payload.get("temperature")
    if m is not None:
        if m < 15 and need != "High":
            return "High", f"soil moisture is critically low ({m:.0f}%)"
        if m >= 48 and need != "Low":
            return "Low", f"soil is already wet ({m:.0f}%)"
        if 15 <= m < 22 and need == "Low":
            return "Medium", f"soil moisture is on the low side ({m:.0f}%)"
    if need == "Low" and t is not None and t >= 38 and (m is None or m < 28):
        return "Medium", f"very hot ({t:.0f}°C) with limited soil moisture"
    return need, None


def _reasons(payload: dict, need: str) -> list[str]:
    out = []
    m = payload.get("soilMoisture")
    if m is not None:
        if m < 18:
            out.append(f"soil moisture is low ({m:.0f}%)")
        elif m > 45:
            out.append(f"soil moisture is comfortable ({m:.0f}%)")
    t = payload.get("temperature")
    if t is not None and t >= 34:
        out.append(f"high temperature ({t:.0f}°C) raises evapotranspiration")
    r = payload.get("rainfall")
    if r is not None and r < 300:
        out.append("recent rainfall has been low")
    fp = payload.get("forecastRainProbability")
    if fp is not None and fp >= 60:
        out.append(f"rain is likely soon ({fp:.0f}% forecast)")
    if not out:
        out.append(f"model rates overall irrigation need as {need.lower()}")
    return out


def recommend_irrigation(payload: dict) -> dict:
    model = _model()
    crop = str(payload.get("crop", "wheat")).lower()
    stage = str(payload.get("growthStage", "vegetative")).lower()
    soil = str(payload.get("soilType", "loamy")).lower()
    method = str(payload.get("irrigationType", "sprinkler")).lower()
    area = float(payload.get("farmSize") or 1.0)

    if model is not None:
        proba = model.predict_proba(_row(payload))[0]
        classes = list(model.named_steps["clf"].classes_)
        idx = int(proba.argmax())
        need = classes[idx]
        need_confidence = round(float(proba[idx]) * 100)
        model_source = "random_forest_classifier"
    else:
        # transparent fallback from soil moisture alone
        m = float(payload.get("soilMoisture", 30))
        need = "High" if m < 20 else "Medium" if m < 38 else "Low"
        need_confidence = 50
        model_source = "rule_fallback"

    override_reason = None
    need, override_reason = _moisture_override(payload, need)
    if override_reason:
        need_confidence = max(need_confidence, 66)
        model_source = f"{model_source}+moisture_rule"

    base_mm = STAGE_WATER_MM.get(crop, DEFAULT_STAGE_WATER).get(stage, DEFAULT_STAGE_WATER["vegetative"])
    net_mm = base_mm * NEED_SCALE[need]

    # forecast-rain adjustment
    fp = payload.get("forecastRainProbability")
    rain_adjust_mm = 0.0
    rainfall_adjustment = "No forecast rainfall adjustment applied."
    if fp is not None and fp >= 60:
        rain_adjust_mm = min(net_mm * 0.6, 25.0)
        rainfall_adjustment = (
            f"{fp:.0f}% chance of rain soon - reduce this irrigation by "
            f"~{rain_adjust_mm:.0f} mm, or skip it if rain arrives."
        )
    net_after = max(0.0, net_mm - rain_adjust_mm)

    eff = METHOD_EFFICIENCY.get(method, 0.7)
    gross_mm = net_after / eff

    days = NEXT_IRRIGATION_DAYS[need].get(soil, NEXT_IRRIGATION_DAYS[need]["loamy"])
    m = payload.get("soilMoisture")
    if m is not None and m < 12:
        days = 0
    next_irrigation = "Now" if days == 0 else f"In about {days} day{'s' if days != 1 else ''}"

    # rough run duration: gross depth over the field, assuming ~6 L/s per hectare delivery
    volume_m3 = gross_mm * 10.0 * area           # 1 mm over 1 ha = 10 m3
    flow_lps = 6.0 * area
    duration_hours = volume_m3 * 1000.0 / (flow_lps * 3600.0) if flow_lps else 0.0

    priority = {"High": "High", "Medium": "Medium", "Low": "Low"}[need]

    return {
        "irrigationNeed": need,
        "needConfidence": need_confidence,
        "priority": priority,
        "waterRequirement": {
            "netDepthMm": round(net_after, 1),
            "grossDepthMm": round(gross_mm, 1),
            "litresPerHectare": round(gross_mm * 10_000, 0),
            "totalVolumeM3": round(volume_m3, 1),
            "text": f"~{gross_mm:.0f} mm ({method}) at the {stage} stage",
        },
        "nextIrrigation": next_irrigation,
        "duration": (
            f"~{duration_hours:.1f} hours for {area:g} ha at ~{flow_lps:.0f} L/s"
            if duration_hours else "depends on your delivery rate"
        ),
        "rainfallAdjustment": rainfall_adjustment,
        "reason": "Because " + "; ".join(
            ([override_reason] if override_reason else []) + _reasons(payload, need)
        ) + ".",
        "assumptions": [
            f"reference depth for {crop}/{stage}: {base_mm:g} mm",
            f"method efficiency ({method}): {eff:.0%}",
            "delivery rate assumed ~6 L/s per hectare for the duration estimate",
        ],
        "model_version": _model_version(),
        "model_source": model_source,
        "disclaimer": (
            "The need class is from a trained model; the depth and schedule are "
            "a rule-of-thumb layer. Check against your own field moisture "
            "readings and local extension advice before irrigating."
        ),
    }
