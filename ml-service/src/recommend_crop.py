"""
Crop-recommendation inference: rank crops by model probability for the given
soil/weather inputs, then enrich the top few from the reference table.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import pandas as pd
from joblib import load

from .crops import (
    CROP_FAVOURABLE, CROP_FEATURES, CROP_REFERENCE,
)

MODEL_PATH = Path("models/crop_model.joblib")
CARD_PATH = MODEL_PATH.with_name("crop_model_card.json")

_LABELS = {
    "nitrogen": "nitrogen", "phosphorus": "phosphorus", "potassium": "potassium",
    "ph": "soil pH", "temperature": "temperature", "humidity": "humidity",
    "rainfall": "rainfall",
}


@lru_cache(maxsize=1)
def _card() -> dict:
    return json.loads(CARD_PATH.read_text()) if CARD_PATH.exists() else {}


@lru_cache(maxsize=1)
def _model():
    return load(MODEL_PATH) if MODEL_PATH.exists() else None


def _model_version() -> str:
    sha = str(_card().get("dataset", {}).get("sha256", ""))[:8]
    return f"crop-1.0-{sha}" if sha else "crop-1.0"


def _row(payload: dict) -> pd.DataFrame:
    d = _card().get("feature_defaults", {})
    return pd.DataFrame([{c: payload.get(c, d.get(c)) for c in CROP_FEATURES}])[CROP_FEATURES]


def _matched_conditions(crop: str, payload: dict) -> list[str]:
    fav = CROP_FAVOURABLE.get(crop, {})
    hits = []
    for feat, (lo, hi) in fav.items():
        v = payload.get(feat)
        if v is None:
            continue
        if lo <= v <= hi:
            hits.append(_LABELS.get(feat, feat))
    return hits


def _enrich(crop: str, score: float, payload: dict) -> dict:
    ref = CROP_REFERENCE.get(crop, {})
    matched = _matched_conditions(crop, payload)
    if matched:
        shown = matched[:3]
        why = f"Your {', '.join(shown)} sit in this crop's favourable range"
        if len(matched) > 3:
            why += f" (and {len(matched) - 3} more)"
    else:
        why = "Ranked mainly on the overall balance of your inputs"
    if ref.get("note"):
        why += f"; {ref['note']}."
    yl = ref.get("yield_t_ha", (None, None))
    du = ref.get("duration_days", (None, None))
    return {
        "crop": crop,
        "suitabilityScore": round(float(score) * 100, 1),
        "expectedYield": {"low": yl[0], "high": yl[1], "unit": "t/ha"},
        "waterRequirement": ref.get("water"),
        "durationDays": {"low": du[0], "high": du[1]},
        "expectedProfit": None,
        "profitNote": "Not estimated - depends on local market price and input costs.",
        "whyRecommended": why,
        "matchedConditions": matched,
    }


def recommend_crops(payload: dict, top_n: int = 3) -> dict:
    model = _model()
    if model is None:
        raise RuntimeError("crop_model.joblib not found - run: python -m src.train_crop")

    proba = model.predict_proba(_row(payload))[0]
    ranked = sorted(zip(model.classes_, proba), key=lambda kv: kv[1], reverse=True)

    recommendations = [_enrich(c, s, payload) for c, s in ranked[:top_n]]
    alternatives = [
        {"crop": c, "suitabilityScore": round(float(s) * 100, 1)}
        for c, s in ranked[top_n:top_n + 4] if float(s) >= 0.01
    ]
    return {
        "recommendations": recommendations,
        "alternatives": alternatives,
        "model_version": _model_version(),
        "model_source": "random_forest_classifier",
        "disclaimer": (
            "Suitability is a model probability from soil and weather inputs "
            "only. It ignores market prices, seed and input availability, pests "
            "and your own experience. Confirm with a local agricultural officer "
            "before sowing."
        ),
    }
