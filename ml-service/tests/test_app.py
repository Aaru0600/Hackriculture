"""
HTTP-level tests against the actual FastAPI app (not the bare `predict_yield`
function) - the request-normalisation layer in `app.py` has its own chance to
reintroduce bugs that direct-import tests never see.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_yield_endpoint_does_not_alias_farm_size_into_area_ha():
    """
    Regression: `YieldRequest.normalised()` used to do
    `data["area_ha"] = data["farm_size_ha"]` before calling `predict_yield`,
    silently reintroducing the exact bug fixed in predict.py's `_real_row` -
    a farmer's own plot size (a few ha) overwriting the state-year aggregate
    `area_ha` the model was actually trained on, collapsing big/high-input
    states' predictions toward the smallest training rows. Direct-import
    tests of `predict_yield` never caught this because they skip
    `normalised()` entirely.
    """
    tiny = client.post("/predict/yield", json={
        "crop": "wheat", "state": "punjab", "season": "rabi", "farm_size_ha": 2,
    })
    assert tiny.status_code == 200
    core = tiny.json()["core_yield_t_ha"]
    assert core > 4.0, (
        f"core yield is {core} t/ha - farm_size_ha is likely leaking into "
        "area_ha again via YieldRequest.normalised()"
    )

    big = client.post("/predict/yield", json={
        "crop": "wheat", "state": "punjab", "season": "rabi", "farm_size_ha": 500,
    })
    assert big.json()["core_yield_t_ha"] == core


def test_yield_endpoint_rejects_unknown_state():
    res = client.post("/predict/yield", json={
        "crop": "wheat", "state": "narnia", "season": "rabi", "farm_size_ha": 2,
    })
    assert res.status_code == 422
