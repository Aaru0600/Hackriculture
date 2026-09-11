"""
Smoke tests for the hybrid crop-yield service.

    python -m pytest -q          (from the ml-service/ directory)

They pass with or without a trained model - `predict_yield` falls back to the
crop reference yield plus the agronomic adjustment when the joblib is absent.
"""

from __future__ import annotations

import math

import pytest

from src.agronomy import agronomic_adjustment
from src.features import CROP_PROFILE
from src.predict import predict_yield

MINIMAL = dict(crop="wheat", state="punjab", season="rabi", farm_size_ha=3.0)

FULL = dict(
    crop="wheat", state="punjab", season="rabi", farm_size_ha=3.0,
    crop_year=2020, annual_rainfall_mm=650, fertilizer_per_ha=180,
    pesticide_per_ha=0.4, soil_type="loamy", growth_stage="flowering",
    nitrogen=120, phosphorus=60, potassium=40, ph=6.8, temperature=18,
    humidity=60, sow_month=11,
)


def test_partial_agro_without_rainfall_does_not_crash():
    # only soil pH given, no rainfall - regression for model_dump() None values
    out = predict_yield({**MINIMAL, "ph": 6.8, "annual_rainfall_mm": None})
    assert out["predicted_yield_t_ha"] > 0
    assert out["adjustment_inputs_used"]  # ph was applied


def test_minimal_payload_works():
    out = predict_yield(dict(MINIMAL))
    for key in ("predicted_yield_t_ha", "core_yield_t_ha", "adjustment_factor",
                "yield_range_t_ha", "prediction_quality", "risk_level",
                "influencing_factors", "response_curves"):
        assert key in out
    # no agronomic inputs -> adjustment is a no-op
    assert out["adjustment_factor"] == 1.0
    assert out["adjustment_inputs_used"] == []


def test_full_payload_shape():
    out = predict_yield(dict(FULL))
    lo, hi = out["yield_range_t_ha"]
    assert 0 <= lo <= out["predicted_yield_t_ha"] <= hi
    assert 0 <= out["prediction_quality"] <= 100
    assert out["risk_level"] in {"low", "moderate", "high"}
    assert out["adjustment_inputs_used"], "agronomic inputs should be applied"
    assert out["expected_production_t"] == pytest.approx(
        out["predicted_yield_t_ha"] * 3.0, abs=0.01
    )


def test_prediction_in_sane_range():
    out = predict_yield(dict(FULL))
    base = CROP_PROFILE["wheat"]["base_yield"]
    assert 0.05 * base <= out["predicted_yield_t_ha"] <= 2.5 * base


def test_bad_ph_lowers_the_estimate():
    good = predict_yield({**FULL, "ph": 6.8})["predicted_yield_t_ha"]
    bad = predict_yield({**FULL, "ph": 4.4})["predicted_yield_t_ha"]
    assert bad < good


def test_regional_defaults_not_the_farmers_own_plot_size():
    """
    Regression: `area_ha` (and the other real-data numeric features) are
    STATE-YEAR AGGREGATES the model was trained on (millions of hectares for
    a big wheat state), not an individual farm. A farmer's own `farm_size_ha`
    (a few hectares) must never be substituted in for the missing `area_ha` -
    that fed the model a wildly out-of-distribution value and silently
    collapsed the prediction toward the smallest-area training rows,
    systematically under-predicting major/high-input states by 30-55%.
    """
    tiny_farm = predict_yield(dict(crop="wheat", state="punjab", season="rabi", farm_size_ha=2))
    # Punjab wheat is a large, intensively-farmed rabi crop - recent state
    # averages run ~4.5-5 t/ha. The old bug produced ~2.75 t/ha here.
    assert tiny_farm["core_yield_t_ha"] > 4.0, (
        "core yield collapsed - farm_size_ha is likely leaking into the "
        "area_ha model feature again"
    )

    big_farm = predict_yield(dict(crop="wheat", state="punjab", season="rabi", farm_size_ha=500))
    # Farm size must only scale `expected_production_t`, never the per-hectare
    # yield itself - the regional model has no notion of one caller's plot.
    assert tiny_farm["core_yield_t_ha"] == pytest.approx(big_farm["core_yield_t_ha"], rel=1e-6)


def test_adjustment_clamped():
    adj = agronomic_adjustment(crop="rice", nitrogen=0, phosphorus=0, potassium=0,
                               ph=4.0, temperature=45, humidity=100,
                               soil_type="laterite", growth_stage="sowing")
    assert 0.7 <= adj["factor"] <= 1.16


def test_response_curves_have_points():
    out = predict_yield(dict(FULL))
    for k in ("rainfall", "temperature"):
        pts = out["response_curves"][k]
        assert len(pts) > 5
        assert all(math.isfinite(p["yield_t_ha"]) for p in pts)
