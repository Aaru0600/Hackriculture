"""Ad-hoc: print predictions for a spread of scenarios.  `python -m tests._smoke_scenarios`"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.predict import predict_yield  # noqa: E402

CASES = [
    ("wheat/punjab minimal", dict(crop="wheat", state="punjab", season="rabi",
        farm_size_ha=3)),
    ("wheat/punjab good agro", dict(crop="wheat", state="punjab", season="rabi",
        farm_size_ha=3, annual_rainfall_mm=650, nitrogen=120, phosphorus=60,
        potassium=40, ph=6.8, temperature=18, humidity=60, soil_type="loamy",
        growth_stage="flowering", sow_month=11)),
    ("wheat/punjab poor agro", dict(crop="wheat", state="punjab", season="rabi",
        farm_size_ha=3, annual_rainfall_mm=250, nitrogen=25, phosphorus=10,
        potassium=8, ph=4.6, temperature=32, humidity=25, soil_type="sandy",
        growth_stage="sowing", sow_month=6)),
    ("rice/west bengal", dict(crop="rice", state="west bengal", season="kharif",
        farm_size_ha=2, annual_rainfall_mm=1600, nitrogen=110, phosphorus=55,
        potassium=50, ph=6.4, temperature=28, humidity=78, soil_type="alluvial",
        growth_stage="vegetative", sow_month=7)),
    ("sugarcane/uttar pradesh", dict(crop="sugarcane", state="uttar pradesh",
        season="whole_year", farm_size_ha=4, annual_rainfall_mm=1000,
        nitrogen=240, phosphorus=110, potassium=110, ph=6.6, temperature=29,
        humidity=70, soil_type="loamy", growth_stage="vegetative")),
    ("potato/uttar pradesh", dict(crop="potato", state="uttar pradesh",
        season="rabi", farm_size_ha=1, annual_rainfall_mm=700, nitrogen=180,
        phosphorus=80, potassium=100, ph=5.8, temperature=18, humidity=65,
        soil_type="loamy", growth_stage="vegetative", sow_month=11)),
]

for name, p in CASES:
    d = predict_yield(p)
    print(f"{name:26} pred {d['predicted_yield_t_ha']:>7} t/ha  "
          f"(core {d['core_yield_t_ha']:>6} x adj {d['adjustment_factor']:.3f})  "
          f"range {str(d['yield_range_t_ha']):<20} qual {d['prediction_quality']:>3}  "
          f"risk {d['risk_level']:<9} ref {d['reference_yield_t_ha']:>6}")
    print(f"{'':26} factors: "
          f"{[(f['label'], f['impact_t_ha'], f['source']) for f in d['influencing_factors'][:3]]}")
