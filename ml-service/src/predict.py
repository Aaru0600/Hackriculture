"""
Hybrid inference for crop yield.

    core = real-data model( crop, state, season, year, area, rainfall,
                            fertiliser/ha, pesticide/ha )
    point = core * agronomic_adjustment( soil N-P-K, pH, temperature,
                                         humidity, soil type, growth stage )

The real-data model (trained on Kaggle state-year aggregates) sets the regional
baseline; the agronomic adjustment layer (`agronomy.py`, transparent response
curves) nudges it for the plot-level inputs the aggregate data lacks. The
response reports both numbers and which inputs moved the estimate.

If no trained model is on disk, `core` falls back to the crop's reference yield
and `model_source` becomes "agronomic_fallback".
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import load

from .agronomy import agronomic_adjustment, condition_score
from .features import (
    AGRONOMIC_FIELDS, CROP_PROFILE, INPUT_RANGES, REAL_FEATURE_ORDER,
)

MODEL_PATH = Path("models/yield_model.joblib")
CARD_PATH = MODEL_PATH.with_name("model_card.json")

DEFAULT_RESID_STD_REL = 0.23

REAL_LABELS = {
    "crop_year": "Year",
    "area_ha": "Farm area",
    "annual_rainfall_mm": "Annual rainfall",
    "fertilizer_per_ha": "Fertiliser use (regional)",
    "pesticide_per_ha": "Pesticide use (regional)",
    "state": "State",
    "season": "Season",
}


@lru_cache(maxsize=1)
def _card() -> dict:
    return json.loads(CARD_PATH.read_text()) if CARD_PATH.exists() else {}


def _model_version() -> str:
    ds = _card().get("dataset", {})
    sha = str(ds.get("sha256", ""))[:8]
    kind = "synth" if ds.get("synthetic", True) else "real"
    return f"2.0-{kind}-{sha}" if sha else "2.0"


@lru_cache(maxsize=1)
def _load_model():
    card = _card()
    transform = card.get("target_transform")
    resid = float(card.get("residual_std_relative", DEFAULT_RESID_STD_REL))
    if not MODEL_PATH.exists():
        return None, "agronomic_fallback", transform, resid
    return load(MODEL_PATH), "gbm", transform, resid


def _defaults() -> dict:
    return _card().get("feature_defaults", {
        "crop_year": 2020, "area_ha": 1000.0, "annual_rainfall_mm": 1100.0,
        "fertilizer_per_ha": 120.0, "pesticide_per_ha": 0.3,
        "state": "uttar pradesh", "season": "kharif",
    })


def _real_row(payload: dict) -> pd.DataFrame:
    d = _defaults()
    row = {}
    for c in REAL_FEATURE_ORDER:
        v = payload.get(c)
        if v is None and c == "area_ha":
            v = payload.get("farm_size_ha")
        row[c] = d.get(c) if v is None else v
    return pd.DataFrame([row])[REAL_FEATURE_ORDER]


def _agro_inputs(payload: dict) -> dict:
    present = {k: payload[k] for k in AGRONOMIC_FIELDS if payload.get(k) is not None}
    return present


def _core_scalar(model, source: str, payload: dict) -> float:
    crop = payload["crop"]
    if source != "gbm":
        return CROP_PROFILE[crop]["base_yield"]
    _, _, transform, _ = _load_model()
    raw = model.predict(_real_row(payload))[0]
    y = np.expm1(raw) if transform == "log1p" else raw
    return max(0.0, float(y))


@lru_cache(maxsize=None)
def _crop_reference(crop: str) -> float:
    """Typical yield for this crop from the training data (fallback: profile)."""
    per = _card().get("per_crop_median_yield_t_ha", {})
    return float(per.get(crop, CROP_PROFILE[crop]["base_yield"]))


def _real_sensitivity(model, source: str, payload: dict, core: float) -> list[dict]:
    """
    Only the regional-data inputs a farmer can actually influence. `crop`,
    `state`, `area_ha` and `crop_year` are excluded - they carry signal in the
    aggregate data but are givens, not levers, and produce misleading swings.
    """
    if source != "gbm":
        return []
    out: list[dict] = []
    for col in ("annual_rainfall_mm", "fertilizer_per_ha"):
        val = float(_real_row(payload)[col].iloc[0])
        rng = INPUT_RANGES[col]
        step = max(abs(val) * 0.2, (rng[1] - rng[0]) * 0.05)
        lo = _core_scalar(model, source, {**payload, col: max(rng[0], val - step)})
        hi = _core_scalar(model, source, {**payload, col: min(rng[1], val + step)})
        out.append({
            "feature": col, "label": REAL_LABELS[col], "source": "regional data",
            "impact_t_ha": round(abs(hi - lo), 3),
            "direction": "raises yield" if hi >= lo else "lowers yield",
        })
    return out


def _adjustment_factors(core: float, adj: dict) -> list[dict]:
    out = []
    for p in adj["parts"]:
        out.append({
            "feature": p["input"], "label": p["label"], "source": "agronomic input",
            "impact_t_ha": round(core * (p["multiplier"] - 1.0), 3),
            "direction": p["direction"],
        })
    return out


def _response_curve(model, source: str, payload: dict, adj_base: dict,
                    kind: str, n: int = 24) -> list[dict]:
    crop = payload["crop"]
    out = []
    if kind == "rainfall":
        need = CROP_PROFILE[crop]["water_need"]
        xs = np.linspace(max(200, need * 0.3), need * 2.0, n)
        for x in xs:
            core = _core_scalar(model, source, {**payload, "annual_rainfall_mm": float(x)})
            out.append({"x": round(float(x), 1),
                        "yield_t_ha": round(core * adj_base["factor"], 3)})
    else:  # temperature - via the agronomic layer only
        opt = CROP_PROFILE[crop]["opt_temp"]
        base_core = _core_scalar(model, source, payload)
        agro = _agro_inputs(payload)
        for x in np.linspace(opt - 15, opt + 15, n):
            a = agronomic_adjustment(crop=crop, **{**agro, "temperature": float(x)})
            out.append({"x": round(float(x), 1),
                        "yield_t_ha": round(base_core * a["factor"], 3)})
    return out


def _risk_level(quality: int, point: float, expected: float) -> str:
    ratio = point / max(expected, 1e-6)
    if quality < 50 or ratio < 0.65:
        return "high"
    if quality < 68 or ratio < 0.85:
        return "moderate"
    return "low"


def predict_yield(payload: dict) -> dict:
    model, source, _, resid_std_rel = _load_model()
    crop = payload["crop"]
    ref_yield = _crop_reference(crop)

    core = _core_scalar(model, source, payload)
    agro = _agro_inputs(payload)
    adj = agronomic_adjustment(crop=crop, **agro)

    point = max(core * adj["factor"], 0.05 * CROP_PROFILE[crop]["base_yield"])

    # reliability score - NOT a calibrated probability
    if agro:
        cond = condition_score(
            crop=crop, season=payload.get("season", CROP_PROFILE[crop]["season"]),
            soil_type=agro.get("soil_type", "loamy"),
            growth_stage=agro.get("growth_stage", "flowering"),
            nitrogen=agro.get("nitrogen", CROP_PROFILE[crop]["rec_n"]),
            phosphorus=agro.get("phosphorus", CROP_PROFILE[crop]["rec_p"]),
            potassium=agro.get("potassium", CROP_PROFILE[crop]["rec_k"]),
            ph=agro.get("ph", CROP_PROFILE[crop]["opt_ph"]),
            temperature=agro.get("temperature", CROP_PROFILE[crop]["opt_temp"]),
            # `or` (not .get default) - model_dump() puts an explicit None here
            rainfall=payload.get("annual_rainfall_mm") or CROP_PROFILE[crop]["water_need"],
            humidity=agro.get("humidity", 65),
            sow_month=agro.get("sow_month"),
        )
        quality = int(np.clip(round(72 * (0.55 + 0.55 * cond)), 40, 95))
    else:
        quality = 68  # regional model only

    rel = resid_std_rel * (1.0 + (0.0 if not agro else 0.3 * (1.0 - min(cond, 1.0))))
    half = 1.28 * rel * point
    lo, hi = max(0.0, point - half), point + half

    factors = _real_sensitivity(model, source, payload, core) \
        + _adjustment_factors(core, adj)
    factors.sort(key=lambda f: abs(f["impact_t_ha"]), reverse=True)

    expected = max(core, 0.6 * ref_yield)
    risk = _risk_level(quality, point, expected)

    farm_size = payload.get("farm_size_ha") or payload.get("area_ha")
    production = round(round(point, 3) * farm_size, 2) if farm_size else None

    return {
        "predicted_yield_t_ha": round(point, 3),
        "core_yield_t_ha": round(core, 3),
        "adjustment_factor": adj["factor"],
        "adjustment_inputs_used": adj["applied"],
        "adjustment_detail": adj["parts"],
        "yield_range_t_ha": [round(lo, 3), round(hi, 3)],
        "expected_production_t": production,
        "prediction_quality": quality,
        "prediction_quality_note": (
            "Reliability score: higher when plot-level agronomic inputs are "
            "supplied and near typical ranges. Not a calibrated probability. "
            "Verify with a local agricultural expert and a soil test."
        ),
        "risk_level": risk,
        "influencing_factors": factors[:6],
        "response_curves": {
            "rainfall": _response_curve(model, source, payload, adj, "rainfall"),
            "temperature": _response_curve(model, source, payload, adj, "temperature"),
        },
        "reference_yield_t_ha": round(ref_yield, 3),
        "model_source": source,
        "model_version": _model_version(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
