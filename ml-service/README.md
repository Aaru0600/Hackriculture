# HACKRICULTURE - ML service

FastAPI micro-service. Only the Node/Express backend calls it; never the browser.

| Endpoint | Model | Trained on |
| --- | --- | --- |
| `POST /predict/yield` | hybrid: `HistGradientBoostingRegressor` + agronomic adjustment | Kaggle *Crop Yield in Indian States* (state-year aggregates) |
| `POST /recommend/crops` | `RandomForestClassifier` (22 crops) | Kaggle *Crop Recommendation Dataset* (2,200 rows, N-P-K + climate) - acc 99%, top-3 100% |
| `POST /recommend/irrigation` | `RandomForestClassifier` (Low/Med/High, `class_weight=balanced`) + rule layer | `irrigation_prediction.csv` (10k rows) - macro-F1 0.97 |

`GET /health` reports which models are loaded; `GET /model-info?task=yield\|crop\|irrigation` returns the matching model card.

### Pipeline per model

```
prepare_*_data.py   raw CSV in data/raw/  ->  data/<name>_dataset.csv  (+ *_data_source.json)
train_*.py          -> models/<name>_model.joblib  +  <name>_model_card.json
recommend_*.py /    inference: classifier probabilities + reference tables / rule layer
predict.py
```

Run all three: `python -m src.prepare_real_data && python -m src.train`,
`python -m src.prepare_crop_data && python -m src.train_crop`,
`python -m src.prepare_irrigation_data && python -m src.train_irrigation`.

## Crop-yield hybrid model

```
core  = real-data model( crop, state, season, year, area,
                         annual rainfall, fertiliser/ha, pesticide/ha )
point = core  x  agronomic_adjustment( soil N-P-K, pH, temperature,
                                       humidity, soil type, growth stage )
```

| | |
| --- | --- |
| **Core** | `HistGradientBoostingRegressor` (sklearn `Pipeline`, one-hot categoricals) on `log1p(yield)`, trained on a **real public dataset**. Sets the regional baseline for a crop / state / season. |
| **Adjustment** | `src/agronomy.py` - transparent response curves (law-of-the-minimum on N-P-K, bell curves for pH / temperature / humidity, soil & growth-stage factors). Turns the farmer's plot-level soil-test inputs into a multiplier clamped to 0.72 - 1.15. Missing inputs contribute nothing (multiplier 1.0). |
| **Interval** | `point x (1 +- 1.28 x relative residual std)` measured on the hold-out (empirical ~80% coverage), widened slightly when agronomic inputs are far from typical. |
| **Reliability score** | 40 - 95, higher when plot-level inputs are supplied and near typical ranges. **Not** called "confidence" and not a calibrated probability. |
| **Influencing factors** | agronomic-adjustment parts (soil pH, N-P-K, ...) + rainfall / fertiliser sensitivity of the core model. `crop`, `state`, `area`, `year` are excluded - givens, not levers. |
| **Charts** | model response curves for rainfall (core model) and temperature (agronomic layer). |

### The core model's training data

**Kaggle - "Crop Yield in Indian States Dataset"**: `data/raw/crop_yield.csv`,
state-year **aggregates** 1997-2020 (`Crop, Crop_Year, Season, State, Area,
Production, Annual_Rainfall, Fertilizer, Pesticide, Yield`). Real government
statistics - **not fabricated**.

`src/prepare_real_data.py` cleans it (strip / lower-case labels, map to our
8-crop vocab, drop rows outside a sane per-crop t/ha window since the raw file
mixes bales / nuts / tonnes, derive per-hectare fertiliser & pesticide) ->
~5,150 rows -> `data/yield_dataset.csv`, plus `data/data_source.json` recording
the raw sha256 and `synthetic: false`.

**Honest limitations, surfaced in the UI:**
- It has **no plot-level soil chemistry, temperature or growth stage** - hence
  the agronomic adjustment layer.
- `Fertilizer` / `Pesticide` / `Annual_Rainfall` are state-year totals, so
  per-hectare values barely vary within a state-year and carry little signal;
  `crop`, `state` and `season` do most of the work.
- Hold-out metrics (below) are real, but the model predicts a **regional
  average**, not a plot-specific figure. Every prediction carries the "verify
  with a local agricultural expert / soil test" disclaimer;
  `models/model_card.json` has the dataset hash and all metrics.

Hold-out (real data): **R2 0.96, MAE 1.2 t/ha, MAPE 18%**; 5-fold CV R2 (log) 0.98.

### Swapping in a better dataset

Any CSV with columns `crop, state, season, crop_year, area_ha,
annual_rainfall_mm, fertilizer_per_ha, pesticide_per_ha, yield_t_ha` at
`data/yield_dataset.csv` -> re-run `python -m src.train`. To re-run the Kaggle
cleaning, replace `data/raw/crop_yield.csv` and run `python -m
src.prepare_real_data` first.

## Setup (Windows PowerShell)

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python -m src.prepare_real_data      # data/raw/crop_yield.csv -> data/yield_dataset.csv
python -m src.train                  # -> models/yield_model.joblib + model_card.json
python -m pytest -q                  # smoke tests
python -m tests._smoke_scenarios     # eyeball a spread of predictions

copy .env.example .env
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

Git Bash: use `./.venv/Scripts/python.exe -m ...` instead of activating.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness + `model_loaded` |
| GET | `/model-info` | full `model_card.json` |
| POST | `/predict/yield` | yield prediction (see `YieldRequest` in `app.py`) |

Interactive docs at `http://127.0.0.1:8001/docs`.

### Example

```bash
curl -X POST http://127.0.0.1:8001/predict/yield \
  -H "Content-Type: application/json" \
  -d '{"crop":"rice","state":"punjab","season":"kharif","farm_size_ha":3,
       "annual_rainfall_mm":700,"nitrogen":120,"phosphorus":60,"potassium":60,
       "ph":6.5,"temperature":27,"humidity":70,"soil_type":"alluvial",
       "growth_stage":"vegetative","sow_month":7}'
```

Only `crop`, `state`, `season`, `farm_size_ha` are required; everything else is
optional. Without the agronomic inputs the adjustment factor is 1.0 and the
response says so. If `models/yield_model.joblib` is absent the service still
answers, using the crop reference yield as the core and setting
`model_source: "agronomic_fallback"`.

## Layout

```
ml-service/
├── app.py                  FastAPI app (request/response models, routes)
├── src/
│   ├── features.py         real-model schema + agronomic vocab + per-crop table
│   ├── agronomy.py         adjustment layer (response curves, agronomic_adjustment)
│   ├── prepare_real_data.py  raw Kaggle CSV -> data/yield_dataset.csv (+ provenance)
│   ├── train.py            fit core model, write model_card.json
│   └── predict.py          hybrid inference: core x adjustment, interval, factors, curves
├── tests/test_predict.py   pytest smoke tests
├── tests/_smoke_scenarios.py
├── data/raw/               the Kaggle CSV (git-ignored)
├── data/                   yield_dataset.csv + data_source.json (git-ignored)
└── models/                 yield_model.joblib + model_card.json (git-ignored)
```
