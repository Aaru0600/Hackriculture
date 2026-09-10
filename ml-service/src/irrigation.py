"""
Irrigation-recommendation feature space + reference tables for the rule layer
that converts the model's Low/Medium/High need class into a water depth and a
schedule.
"""

from __future__ import annotations

IRR_NUMERIC: list[str] = [
    "soil_ph", "soil_moisture", "organic_carbon", "electrical_conductivity",
    "temperature_c", "humidity", "rainfall_mm", "sunlight_hours",
    "wind_speed_kmh", "field_area_hectare", "previous_irrigation_mm",
]
IRR_CATEGORICAL: list[str] = [
    "soil_type", "crop_type", "crop_growth_stage", "season",
    "irrigation_type", "water_source", "mulching_used", "region",
]
IRR_FEATURE_ORDER: list[str] = IRR_CATEGORICAL + IRR_NUMERIC
IRR_TARGET = "irrigation_need"
IRR_CLASSES = ["Low", "Medium", "High"]

# Raw CSV header -> our snake_case feature name
IRR_CSV_RENAME = {
    "Soil_Type": "soil_type", "Soil_pH": "soil_ph", "Soil_Moisture": "soil_moisture",
    "Organic_Carbon": "organic_carbon", "Electrical_Conductivity": "electrical_conductivity",
    "Temperature_C": "temperature_c", "Humidity": "humidity", "Rainfall_mm": "rainfall_mm",
    "Sunlight_Hours": "sunlight_hours", "Wind_Speed_kmh": "wind_speed_kmh",
    "Crop_Type": "crop_type", "Crop_Growth_Stage": "crop_growth_stage", "Season": "season",
    "Irrigation_Type": "irrigation_type", "Water_Source": "water_source",
    "Field_Area_hectare": "field_area_hectare", "Mulching_Used": "mulching_used",
    "Previous_Irrigation_mm": "previous_irrigation_mm", "Region": "region",
    "Irrigation_Need": "irrigation_need",
}

IRR_SOIL_TYPES = ["clay", "loamy", "sandy", "silt"]
IRR_CROPS = ["cotton", "maize", "potato", "rice", "sugarcane", "wheat"]
IRR_GROWTH_STAGES = ["sowing", "vegetative", "flowering", "harvest"]
IRR_SEASONS = ["kharif", "rabi", "zaid"]
IRR_IRRIGATION_TYPES = ["canal", "drip", "rainfed", "sprinkler"]
IRR_WATER_SOURCES = ["groundwater", "rainwater", "reservoir", "river"]
IRR_REGIONS = ["central", "east", "north", "south", "west"]

# Reference net water depth (mm) per irrigation event, by crop x growth stage,
# under an average need. Compiled from crop-water-requirement (Kc) guidance;
# the rule layer scales this by the predicted need class and rainfall.
STAGE_WATER_MM: dict[str, dict[str, float]] = {
    "rice":      {"sowing": 50, "vegetative": 60, "flowering": 65, "harvest": 20},
    "wheat":     {"sowing": 35, "vegetative": 45, "flowering": 50, "harvest": 15},
    "maize":     {"sowing": 35, "vegetative": 50, "flowering": 60, "harvest": 20},
    "cotton":    {"sowing": 40, "vegetative": 55, "flowering": 65, "harvest": 20},
    "sugarcane": {"sowing": 45, "vegetative": 70, "flowering": 75, "harvest": 25},
    "potato":    {"sowing": 30, "vegetative": 45, "flowering": 50, "harvest": 15},
}
DEFAULT_STAGE_WATER = {"sowing": 35, "vegetative": 50, "flowering": 55, "harvest": 18}

NEED_SCALE = {"Low": 0.55, "Medium": 1.0, "High": 1.35}
# Days until the next irrigation, by need class and soil type (sandy drains fast).
NEXT_IRRIGATION_DAYS = {
    "High":   {"sandy": 1, "loamy": 2, "silt": 2, "clay": 3},
    "Medium": {"sandy": 3, "loamy": 4, "silt": 5, "clay": 6},
    "Low":    {"sandy": 6, "loamy": 8, "silt": 9, "clay": 10},
}
# Application efficiency by method (net depth / gross water applied).
METHOD_EFFICIENCY = {"drip": 0.90, "sprinkler": 0.75, "canal": 0.55, "rainfed": 0.55}

IRR_INPUT_RANGES: dict[str, tuple[float, float]] = {
    "soil_ph": (3.5, 9.5), "soil_moisture": (0.0, 100.0), "organic_carbon": (0.0, 5.0),
    "electrical_conductivity": (0.0, 6.0), "temperature_c": (5.0, 50.0),
    "humidity": (5.0, 100.0), "rainfall_mm": (0.0, 3000.0), "sunlight_hours": (0.0, 16.0),
    "wind_speed_kmh": (0.0, 60.0), "field_area_hectare": (0.01, 100000.0),
    "previous_irrigation_mm": (0.0, 300.0),
    "forecast_rain_probability": (0.0, 100.0),
}
