"""Smoke tests for crop-recommendation and irrigation-recommendation."""
from __future__ import annotations

import pytest

from src.recommend_crop import recommend_crops
from src.recommend_irrigation import recommend_irrigation

CROP_IN = dict(nitrogen=90, phosphorus=42, potassium=43, temperature=21,
               humidity=82, ph=6.5, rainfall=200)


def test_crop_rec_shape_and_ranking():
    out = recommend_crops(dict(CROP_IN), top_n=3)
    recs = out["recommendations"]
    assert len(recs) == 3
    scores = [r["suitabilityScore"] for r in recs]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)
    r0 = recs[0]
    for k in ("crop", "expectedYield", "waterRequirement", "durationDays", "whyRecommended"):
        assert k in r0
    assert out["disclaimer"]


def test_crop_rec_responds_to_inputs():
    wet = recommend_crops({**CROP_IN, "rainfall": 260, "humidity": 85})["recommendations"][0]["crop"]
    dry = recommend_crops({**CROP_IN, "rainfall": 40, "humidity": 20, "temperature": 20})["recommendations"][0]["crop"]
    assert wet != dry


IRR_IN = dict(crop="wheat", soilType="loamy", growthStage="flowering",
              soilMoisture=14, temperature=36, humidity=40, rainfall=150,
              forecastRainProbability=15, farmSize=3, irrigationType="drip")


def test_irrigation_shape():
    out = recommend_irrigation(dict(IRR_IN))
    assert out["irrigationNeed"] in {"Low", "Medium", "High"}
    assert out["priority"] in {"Low", "Medium", "High"}
    assert out["waterRequirement"]["grossDepthMm"] >= out["waterRequirement"]["netDepthMm"] >= 0
    assert out["nextIrrigation"]
    assert out["reason"].startswith("Because")
    assert out["disclaimer"]


def test_irrigation_dry_field_needs_more_than_wet_field():
    dry = recommend_irrigation({**IRR_IN, "soilMoisture": 10})
    wet = recommend_irrigation({**IRR_IN, "soilMoisture": 55, "temperature": 22})
    assert dry["waterRequirement"]["netDepthMm"] >= wet["waterRequirement"]["netDepthMm"]


def test_irrigation_forecast_rain_defers():
    out = recommend_irrigation({**IRR_IN, "forecastRainProbability": 85})
    assert "reduce" in out["rainfallAdjustment"].lower() or "skip" in out["rainfallAdjustment"].lower()
