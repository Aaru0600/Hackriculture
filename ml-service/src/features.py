"""
Feature space for the hybrid crop-yield model.

The served model is trained on a REAL public dataset (Kaggle "Crop Yield in
Indian States", 1997-2020 state-year aggregates). Its features are the ones the
dataset actually carries - crop, state, season, year, area, annual rainfall,
and per-hectare fertiliser / pesticide use.

The dataset has no plot-level soil chemistry, temperature or growth stage, so
those form inputs feed a separate, clearly-labelled AGRONOMIC ADJUSTMENT layer
(`agronomy.py`) that nudges the real-data estimate up or down. This module
defines both sets.
"""

from __future__ import annotations

# --- Real-data model schema -------------------------------------------------

REAL_NUMERIC: list[str] = [
    "crop_year",             # calendar year
    "area_ha",               # cultivated area, hectares
    "annual_rainfall_mm",    # annual rainfall, mm
    "fertilizer_per_ha",     # total fertiliser use / area, kg/ha
    "pesticide_per_ha",      # total pesticide use / area, kg/ha
]

REAL_CATEGORICAL: list[str] = ["crop", "state", "season"]

REAL_FEATURE_ORDER: list[str] = REAL_CATEGORICAL + REAL_NUMERIC
TARGET: str = "yield_t_ha"

# --- Agronomic adjustment inputs (optional; not in the trained model) ------

AGRONOMIC_FIELDS: list[str] = [
    "soil_type", "growth_stage",
    "nitrogen", "phosphorus", "potassium", "ph", "temperature", "humidity",
    "sow_month",
]

# --- Categorical vocabularies ----------------------------------------------

CROPS: list[str] = [
    "rice", "wheat", "maize", "cotton",
    "sugarcane", "soybean", "groundnut", "potato",
]

# Raw dataset crop label -> our normalised key. Anything not listed is dropped.
CROP_ALIASES: dict[str, str] = {
    "rice": "rice",
    "wheat": "wheat",
    "maize": "maize",
    "cotton(lint)": "cotton",
    "sugarcane": "sugarcane",
    "soyabean": "soybean",
    "soybean": "soybean",
    "groundnut": "groundnut",
    "potato": "potato",
}

SEASONS: list[str] = ["kharif", "rabi", "summer", "autumn", "winter", "whole_year"]

SEASON_ALIASES: dict[str, str] = {
    "kharif": "kharif",
    "rabi": "rabi",
    "summer": "summer",
    "zaid": "summer",
    "autumn": "autumn",
    "winter": "winter",
    "whole year": "whole_year",
    "whole_year": "whole_year",
}

# 30 states/UTs present in the dataset (normalised lower-case, spaces kept).
STATES: list[str] = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "delhi", "goa", "gujarat", "haryana", "himachal pradesh",
    "jammu and kashmir", "jharkhand", "karnataka", "kerala", "madhya pradesh",
    "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
    "puducherry", "punjab", "sikkim", "tamil nadu", "telangana", "tripura",
    "uttar pradesh", "uttarakhand", "west bengal",
]

SOIL_TYPES: list[str] = [
    "alluvial", "black", "red", "laterite",
    "sandy", "clayey", "loamy", "silty",
]

GROWTH_STAGES: list[str] = ["sowing", "vegetative", "flowering", "maturity"]

# --- Per-crop agronomic reference table (drives the adjustment layer) ------
# base_yield  : t/ha near the national average under adequate management
# opt_ph      : centre of the favourable soil-pH window
# opt_temp    : favourable mean season temperature, degC
# water_need  : favourable annual rainfall, mm
# rec_n/p/k   : recommended nutrient dose, kg/ha
# season      : primary growing season
# sow_months  : ideal sowing months (1-12)
CROP_PROFILE: dict[str, dict] = {
    "rice": dict(base_yield=2.7, opt_ph=6.5, opt_temp=27, water_need=1400,
                 rec_n=120, rec_p=60, rec_k=60, season="kharif",
                 sow_months=(6, 7, 8)),
    "wheat": dict(base_yield=3.2, opt_ph=6.8, opt_temp=18, water_need=650,
                  rec_n=120, rec_p=60, rec_k=40, season="rabi",
                  sow_months=(11, 12)),
    "maize": dict(base_yield=2.8, opt_ph=6.2, opt_temp=24, water_need=800,
                  rec_n=120, rec_p=60, rec_k=40, season="kharif",
                  sow_months=(6, 7)),
    "cotton": dict(base_yield=0.5, opt_ph=6.5, opt_temp=28, water_need=900,
                   rec_n=100, rec_p=50, rec_k=50, season="kharif",
                   sow_months=(5, 6)),
    "sugarcane": dict(base_yield=70.0, opt_ph=6.5, opt_temp=30, water_need=1600,
                      rec_n=250, rec_p=115, rec_k=115, season="whole_year",
                      sow_months=(2, 3, 10)),
    "soybean": dict(base_yield=1.1, opt_ph=6.5, opt_temp=26, water_need=900,
                    rec_n=30, rec_p=75, rec_k=45, season="kharif",
                    sow_months=(6, 7)),
    "groundnut": dict(base_yield=1.3, opt_ph=6.3, opt_temp=27, water_need=800,
                      rec_n=25, rec_p=50, rec_k=75, season="kharif",
                      sow_months=(6, 7)),
    "potato": dict(base_yield=20.0, opt_ph=5.8, opt_temp=18, water_need=700,
                   rec_n=180, rec_p=80, rec_k=100, season="rabi",
                   sow_months=(10, 11)),
}

SOIL_FACTOR: dict[str, float] = {
    "loamy": 1.00, "alluvial": 1.00, "black": 0.98, "silty": 0.96,
    "red": 0.90, "clayey": 0.92, "sandy": 0.85, "laterite": 0.82,
}

STAGE_FACTOR: dict[str, float] = {
    "sowing": 0.98, "vegetative": 0.99, "flowering": 1.00, "maturity": 1.01,
}

# --- Plausible input ranges (validation + sensitivity sweeps) --------------

INPUT_RANGES: dict[str, tuple[float, float]] = {
    "crop_year": (1990.0, 2035.0),
    "area_ha": (0.01, 5_000_000.0),
    "annual_rainfall_mm": (100.0, 7000.0),
    "fertilizer_per_ha": (0.0, 500.0),
    "pesticide_per_ha": (0.0, 50.0),
    "nitrogen": (0.0, 400.0),
    "phosphorus": (0.0, 200.0),
    "potassium": (0.0, 200.0),
    "ph": (3.5, 9.5),
    "temperature": (5.0, 45.0),
    "humidity": (10.0, 100.0),
    "farm_size_ha": (0.01, 100000.0),
}

# Sane yield window (t/ha) per crop - rows outside are dropped as unit errors
# (the raw file mixes bales / nuts / tonnes across crops).
YIELD_WINDOW: dict[str, tuple[float, float]] = {
    "rice": (0.3, 7.0), "wheat": (0.3, 7.0), "maize": (0.3, 10.0),
    "cotton": (0.05, 1.5), "sugarcane": (15.0, 160.0), "soybean": (0.2, 4.0),
    "groundnut": (0.2, 5.0), "potato": (3.0, 60.0),
}
