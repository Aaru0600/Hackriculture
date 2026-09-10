"""
Transparent agronomic response model - the ADJUSTMENT LAYER of the hybrid.

The served model is trained on real state-year aggregates and has no plot-level
soil chemistry, temperature or growth stage. `agronomic_adjustment()` turns the
farmer's soil-test / weather inputs into a multiplier (~0.72 - 1.15) applied to
that model's estimate, and `condition_score()` gives a 0-1 "how ordinary are
these conditions" index used for the reliability score.

Every factor is a simple, inspectable curve fitted to no real data - treat the
adjustment as agronomic guidance, not a measurement. `expected_yield()` remains
as a self-contained illustrative predictor for the no-model fallback path.
"""

from __future__ import annotations

import math

from .features import CROP_PROFILE, SOIL_FACTOR, STAGE_FACTOR


def _saturating(x: float, half: float, floor: float = 0.5) -> float:
    """Rises from `floor` towards 1 as x grows; ~1.0 by x = half (recommended dose)."""
    if x <= 0:
        return floor
    return 1.0 - (1.0 - floor) * math.exp(-2.2 * (x / half))


def _bell(value: float, centre: float, spread: float) -> float:
    """Gaussian response, 1.0 at the optimum."""
    z = (value - centre) / spread
    return math.exp(-0.5 * z * z)


def nutrient_factor(applied: float, recommended: float, *, cereal: bool) -> float:
    x = applied / max(recommended, 1e-6)
    f = _saturating(x, half=1.0, floor=0.4)
    if cereal and x > 1.6:                       # lodging / diminishing returns
        f *= max(0.75, 1.0 - 0.05 * (x - 1.6))
    return f


def ph_factor(ph: float, opt_ph: float) -> float:
    return _bell(ph, opt_ph, spread=0.9)


def water_factor(rainfall: float, water_need: float) -> float:
    # wider tolerance to surplus than to deficit
    spread = 0.45 * water_need if rainfall < water_need else 0.65 * water_need
    return _bell(rainfall, water_need, spread=spread)


def temperature_factor(temp: float, opt_temp: float) -> float:
    return _bell(temp, opt_temp, spread=6.0)


def humidity_factor(humidity: float) -> float:
    # mild optimum around 65%; disease drag above ~85%
    f = 0.85 + 0.15 * _bell(humidity, 65.0, spread=25.0)
    if humidity > 85:
        f *= max(0.85, 1.0 - 0.004 * (humidity - 85))
    return f


def season_factor(season: str, crop: str) -> float:
    return 1.0 if season == CROP_PROFILE[crop]["season"] else 0.82


def sowing_factor(sow_month: int | None, crop: str) -> float:
    if not sow_month:
        return 0.97
    ideal = CROP_PROFILE[crop]["sow_months"]
    if sow_month in ideal:
        return 1.0
    gap = min(abs(sow_month - m) for m in ideal)
    return max(0.80, 1.0 - 0.09 * gap)


def previous_yield_factor(previous_yield: float, base_yield: float) -> float:
    if previous_yield <= 0:
        return 1.0
    z = max(-0.6, min(0.6, previous_yield / base_yield - 1.0))
    return 1.0 + 0.12 * z


def expected_yield(
    *,
    crop: str,
    soil_type: str,
    season: str,
    growth_stage: str,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    ph: float,
    temperature: float,
    rainfall: float,
    humidity: float,
    previous_yield: float,
    sow_month: int | None = None,
    noise: float = 1.0,
) -> float:
    """Return an illustrative yield in t/ha for the given conditions."""
    profile = CROP_PROFILE[crop]
    base = profile["base_yield"]

    factors = list(_condition_factors(
        crop=crop, soil_type=soil_type, season=season, growth_stage=growth_stage,
        nitrogen=nitrogen, phosphorus=phosphorus, potassium=potassium, ph=ph,
        temperature=temperature, rainfall=rainfall, humidity=humidity,
        sow_month=sow_month,
    ))
    factors.append(previous_yield_factor(previous_yield, base))

    y = base
    for f in factors:
        y *= f
    y *= noise
    return max(0.1 * base, min(1.8 * base, y))


def _condition_factors(
    *,
    crop: str,
    soil_type: str,
    season: str,
    growth_stage: str,
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    ph: float,
    temperature: float,
    rainfall: float,
    humidity: float,
    sow_month: int | None = None,
) -> tuple[float, ...]:
    """The growing-condition response factors (no base yield, no noise, no history)."""
    profile = CROP_PROFILE[crop]
    cereal = crop in ("rice", "wheat", "maize")

    # Nutrients follow the law of the minimum: the scarcest of N/P/K caps yield,
    # rather than three factors compounding into an unrealistically low number.
    npk_factor = min(
        nutrient_factor(nitrogen, profile["rec_n"], cereal=cereal),
        nutrient_factor(phosphorus, profile["rec_p"], cereal=cereal),
        nutrient_factor(potassium, profile["rec_k"], cereal=cereal),
    )
    return (
        npk_factor,
        ph_factor(ph, profile["opt_ph"]),
        water_factor(rainfall, profile["water_need"]),
        temperature_factor(temperature, profile["opt_temp"]),
        humidity_factor(humidity),
        season_factor(season, crop),
        sowing_factor(sow_month, crop),
        SOIL_FACTOR.get(soil_type, 0.9),
        STAGE_FACTOR.get(growth_stage, 1.0),
    )


def condition_score(**kwargs) -> float:
    """
    0..~1 index of how favourable the growing conditions are (1 = every factor
    near its optimum). Used to modulate the per-prediction reliability score:
    extreme inputs sit in sparsely-sampled regions where the model is weaker.
    """
    score = 1.0
    for f in _condition_factors(**kwargs):
        score *= f
    return max(0.0, min(1.05, score))


# --- Adjustment layer for the hybrid model --------------------------------

ADJ_MIN, ADJ_MAX = 0.72, 1.15


def agronomic_adjustment(
    *,
    crop: str,
    soil_type: str | None = None,
    growth_stage: str | None = None,
    nitrogen: float | None = None,
    phosphorus: float | None = None,
    potassium: float | None = None,
    ph: float | None = None,
    temperature: float | None = None,
    humidity: float | None = None,
    sow_month: int | None = None,
) -> dict:
    """
    Multiplier to apply to the real-data yield estimate, based on whichever
    plot-level agronomic inputs the farmer supplied. Each part is that input's
    response factor divided by its value at recommended practice, so a part is
    ~1.0 when the input is near-ideal, <1 when it limits yield, up to ~1.1 when
    it is better than the reference. Missing inputs contribute nothing.

    Returns {factor, parts: [{input, label, multiplier, direction}], applied}.
    """
    profile = CROP_PROFILE[crop]
    cereal = crop in ("rice", "wheat", "maize")
    parts: list[dict] = []

    def add(name: str, label: str, mult: float) -> None:
        parts.append({
            "input": name,
            "label": label,
            "multiplier": round(mult, 3),
            "direction": ("raises the estimate" if mult > 1.01
                          else "lowers the estimate" if mult < 0.99
                          else "about neutral"),
        })

    if None not in (nitrogen, phosphorus, potassium):
        f = min(
            nutrient_factor(nitrogen, profile["rec_n"], cereal=cereal),
            nutrient_factor(phosphorus, profile["rec_p"], cereal=cereal),
            nutrient_factor(potassium, profile["rec_k"], cereal=cereal),
        )
        ref = min(
            nutrient_factor(profile["rec_n"], profile["rec_n"], cereal=cereal),
            nutrient_factor(profile["rec_p"], profile["rec_p"], cereal=cereal),
            nutrient_factor(profile["rec_k"], profile["rec_k"], cereal=cereal),
        )
        add("npk", "Soil N-P-K vs recommended dose", f / ref)

    if ph is not None:
        add("ph", "Soil pH", ph_factor(ph, profile["opt_ph"]))  # ref = 1.0
    if temperature is not None:
        add("temperature", "Season temperature",
            temperature_factor(temperature, profile["opt_temp"]))  # ref = 1.0
    if humidity is not None:
        add("humidity", "Relative humidity",
            humidity_factor(humidity) / humidity_factor(65.0))
    if soil_type is not None:
        add("soil_type", "Soil type",
            SOIL_FACTOR.get(soil_type, 0.9) / SOIL_FACTOR["loamy"])
    if growth_stage is not None:
        add("growth_stage", "Growth stage",
            STAGE_FACTOR.get(growth_stage, 1.0))  # ref = 1.0
    if sow_month is not None:
        add("sow_month", "Sowing time", sowing_factor(sow_month, crop))

    factor = 1.0
    for p in parts:
        factor *= p["multiplier"]
    factor = max(ADJ_MIN, min(ADJ_MAX, factor))

    return {
        "factor": round(factor, 3),
        "parts": sorted(parts, key=lambda p: abs(p["multiplier"] - 1.0), reverse=True),
        "applied": [p["input"] for p in parts],
    }
