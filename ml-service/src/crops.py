"""
Crop-recommendation feature space + a per-crop reference table used to enrich
the model's ranked output (the training dataset only has agronomic inputs and a
crop label - duration, water need and typical yield come from published extension
ranges, and are planning figures, not guarantees).
"""

from __future__ import annotations

# --- Model schema (Kaggle "Crop Recommendation Dataset") ------------------

CROP_FEATURES: list[str] = [
    "nitrogen", "phosphorus", "potassium",
    "temperature", "humidity", "ph", "rainfall",
]
CROP_TARGET = "label"

# Raw CSV column -> our feature name
CROP_CSV_RENAME = {
    "N": "nitrogen", "P": "phosphorus", "K": "potassium",
    "temperature": "temperature", "humidity": "humidity",
    "ph": "ph", "rainfall": "rainfall", "label": "label",
}

# 22 crops in the dataset
CROP_LABELS: list[str] = [
    "rice", "maize", "chickpea", "kidneybeans", "pigeonpeas", "mothbeans",
    "mungbean", "blackgram", "lentil", "pomegranate", "banana", "mango",
    "grapes", "watermelon", "muskmelon", "apple", "orange", "papaya",
    "coconut", "cotton", "jute", "coffee",
]

# duration_days: sowing -> harvest window
# water: qualitative seasonal water need
# yield_t_ha: typical Indian yield range under adequate management
# note: one-line agronomic character (shown as part of "why recommended")
CROP_REFERENCE: dict[str, dict] = {
    "rice":        dict(duration_days=(110, 150), water="High",       yield_t_ha=(3.0, 6.0), note="warm, very wet, tolerates standing water"),
    "maize":       dict(duration_days=(90, 120),  water="Medium",     yield_t_ha=(2.5, 6.0), note="warm season, well-drained loam, moderate N"),
    "chickpea":    dict(duration_days=(90, 120),  water="Low",        yield_t_ha=(1.0, 2.0), note="cool, dry rabi pulse, low water, fixes nitrogen"),
    "kidneybeans": dict(duration_days=(85, 110),  water="Medium",     yield_t_ha=(1.0, 2.0), note="mild temperatures, sensitive to waterlogging"),
    "pigeonpeas":  dict(duration_days=(120, 180), water="Low",        yield_t_ha=(0.8, 1.5), note="long-duration pulse, drought-hardy, poor soils"),
    "mothbeans":   dict(duration_days=(75, 90),   water="Low",        yield_t_ha=(0.4, 0.9), note="arid-zone pulse, very drought tolerant"),
    "mungbean":    dict(duration_days=(60, 90),   water="Low",        yield_t_ha=(0.8, 1.4), note="short-duration pulse, warm, low water"),
    "blackgram":   dict(duration_days=(70, 95),   water="Low",        yield_t_ha=(0.6, 1.2), note="warm pulse, tolerates light drought"),
    "lentil":      dict(duration_days=(100, 130), water="Low",        yield_t_ha=(0.9, 1.6), note="cool dry rabi pulse, low input"),
    "pomegranate": dict(duration_days=(180, 210), water="Low",        yield_t_ha=(10.0, 20.0), note="semi-arid fruit, deep well-drained soil"),
    "banana":      dict(duration_days=(300, 365), water="High",       yield_t_ha=(30.0, 60.0), note="humid tropics, heavy feeder, year-round water"),
    "mango":       dict(duration_days=(120, 150), water="Medium",     yield_t_ha=(6.0, 12.0), note="tropical fruit tree, dry spell aids flowering"),
    "grapes":      dict(duration_days=(150, 180), water="Medium",     yield_t_ha=(15.0, 25.0), note="warm dry ripening, well-drained soil"),
    "watermelon":  dict(duration_days=(80, 100),  water="Medium",     yield_t_ha=(20.0, 35.0), note="warm, sandy loam, sensitive to humidity/disease"),
    "muskmelon":   dict(duration_days=(80, 100),  water="Medium",     yield_t_ha=(12.0, 20.0), note="warm dry, sandy loam, low humidity preferred"),
    "apple":       dict(duration_days=(150, 180), water="Medium",     yield_t_ha=(8.0, 20.0), note="temperate, needs winter chilling"),
    "orange":      dict(duration_days=(240, 300), water="Medium",     yield_t_ha=(10.0, 20.0), note="subtropical citrus, well-drained slightly acidic soil"),
    "papaya":      dict(duration_days=(270, 330), water="Medium",     yield_t_ha=(40.0, 80.0), note="frost-free tropics, continuous fruiting"),
    "coconut":     dict(duration_days=(365, 400), water="High",       yield_t_ha=(8.0, 14.0), note="humid coastal, deep sandy loam, perennial"),
    "cotton":      dict(duration_days=(150, 180), water="Medium",     yield_t_ha=(1.0, 2.5), note="long warm season, black or alluvial soil"),
    "jute":        dict(duration_days=(100, 130), water="High",       yield_t_ha=(2.0, 3.5), note="hot humid, high rainfall, alluvial soil"),
    "coffee":      dict(duration_days=(240, 300), water="Medium",     yield_t_ha=(0.8, 1.8), note="shaded highland, mild temperatures, acidic soil"),
}

# Favourable input windows per crop, for the rule-based "why recommended" text.
# (min, max) on the model's own feature scale.
CROP_FAVOURABLE: dict[str, dict] = {
    "rice":        dict(nitrogen=(60, 120), phosphorus=(30, 60), potassium=(30, 45), ph=(5.5, 7.0), temperature=(22, 30), humidity=(75, 90), rainfall=(180, 300)),
    "maize":       dict(nitrogen=(60, 120), phosphorus=(35, 60), potassium=(15, 25), ph=(5.8, 7.0), temperature=(20, 30), humidity=(50, 75), rainfall=(60, 110)),
    "chickpea":    dict(nitrogen=(20, 60),  phosphorus=(55, 80), potassium=(75, 85), ph=(6.0, 8.0), temperature=(15, 25), humidity=(12, 20), rainfall=(60, 100)),
    "kidneybeans": dict(nitrogen=(15, 40),  phosphorus=(55, 75), potassium=(18, 25), ph=(5.5, 6.5), temperature=(15, 25), humidity=(18, 25), rainfall=(60, 150)),
    "pigeonpeas":  dict(nitrogen=(10, 40),  phosphorus=(55, 75), potassium=(18, 25), ph=(5.0, 7.0), temperature=(18, 30), humidity=(30, 70), rainfall=(90, 200)),
    "mothbeans":   dict(nitrogen=(10, 40),  phosphorus=(35, 60), potassium=(15, 25), ph=(3.5, 10),  temperature=(24, 32), humidity=(40, 65), rainfall=(30, 70)),
    "mungbean":    dict(nitrogen=(10, 40),  phosphorus=(35, 60), potassium=(15, 25), ph=(6.0, 7.5), temperature=(25, 35), humidity=(80, 90), rainfall=(40, 70)),
    "blackgram":   dict(nitrogen=(20, 60),  phosphorus=(55, 75), potassium=(18, 25), ph=(6.5, 7.5), temperature=(25, 35), humidity=(60, 75), rainfall=(60, 80)),
    "lentil":      dict(nitrogen=(10, 40),  phosphorus=(55, 75), potassium=(18, 25), ph=(6.0, 7.5), temperature=(18, 30), humidity=(60, 70), rainfall=(40, 70)),
    "pomegranate": dict(nitrogen=(10, 40),  phosphorus=(10, 25), potassium=(35, 45), ph=(6.0, 7.5), temperature=(18, 25), humidity=(85, 95), rainfall=(100, 120)),
    "banana":      dict(nitrogen=(80, 120), phosphorus=(70, 95), potassium=(45, 55), ph=(5.5, 7.0), temperature=(25, 30), humidity=(75, 85), rainfall=(90, 120)),
    "mango":       dict(nitrogen=(0, 40),   phosphorus=(15, 35), potassium=(25, 40), ph=(4.5, 7.0), temperature=(27, 36), humidity=(45, 55), rainfall=(90, 110)),
    "grapes":      dict(nitrogen=(0, 40),   phosphorus=(120, 145), potassium=(195, 205), ph=(5.5, 6.5), temperature=(8, 40), humidity=(80, 84), rainfall=(65, 75)),
    "watermelon":  dict(nitrogen=(80, 120), phosphorus=(10, 25), potassium=(45, 55), ph=(6.0, 7.0), temperature=(24, 27), humidity=(80, 92), rainfall=(40, 55)),
    "muskmelon":   dict(nitrogen=(80, 120), phosphorus=(10, 25), potassium=(45, 55), ph=(6.0, 6.8), temperature=(27, 30), humidity=(90, 95), rainfall=(20, 30)),
    "apple":       dict(nitrogen=(0, 40),   phosphorus=(120, 145), potassium=(195, 205), ph=(5.5, 6.5), temperature=(21, 24), humidity=(90, 95), rainfall=(100, 125)),
    "orange":      dict(nitrogen=(0, 40),   phosphorus=(5, 25),  potassium=(5, 15),  ph=(6.0, 7.5), temperature=(10, 35), humidity=(90, 95), rainfall=(100, 120)),
    "papaya":      dict(nitrogen=(30, 70),  phosphorus=(45, 70), potassium=(45, 55), ph=(6.5, 7.0), temperature=(23, 44), humidity=(90, 95), rainfall=(40, 250)),
    "coconut":     dict(nitrogen=(0, 40),   phosphorus=(5, 25),  potassium=(25, 40), ph=(5.5, 7.0), temperature=(25, 29), humidity=(90, 100), rainfall=(130, 250)),
    "cotton":      dict(nitrogen=(100, 140), phosphorus=(35, 60), potassium=(15, 25), ph=(5.8, 8.0), temperature=(22, 26), humidity=(75, 85), rainfall=(60, 100)),
    "jute":        dict(nitrogen=(70, 100), phosphorus=(35, 60), potassium=(35, 45), ph=(6.0, 7.5), temperature=(23, 27), humidity=(70, 90), rainfall=(150, 200)),
    "coffee":      dict(nitrogen=(80, 120), phosphorus=(15, 35), potassium=(25, 35), ph=(6.0, 7.0), temperature=(23, 28), humidity=(50, 70), rainfall=(130, 200)),
}

CROP_INPUT_RANGES: dict[str, tuple[float, float]] = {
    "nitrogen": (0.0, 200.0), "phosphorus": (0.0, 200.0), "potassium": (0.0, 220.0),
    "temperature": (5.0, 45.0), "humidity": (5.0, 100.0), "ph": (3.0, 10.0),
    "rainfall": (10.0, 320.0),
}
