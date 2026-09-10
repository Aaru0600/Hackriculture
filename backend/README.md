# HACKRICULTURE - backend

Node.js + Express API. Owns **authentication, business logic, MongoDB**, and is
the only tier that calls the Python ML service.

```
React (Vite, :5173)  --REST-->  THIS (:4000/api)  -->  MongoDB
                                       |
                                       +-->  ml-service (FastAPI, :8001)
```

ESM (`"type": "module"`). Tests use Node's built-in runner (`node:test`) +
Supertest, with an in-memory MongoDB and a stub ML server - no external services
needed for `npm test`.

## Status (Phase 5 slice)

| Area | State |
| --- | --- |
| Auth (`/api/auth/*`) | **done** - register / login / logout / me / profile / forgot-password, bcrypt + JWT, Zod validation, rate-limited |
| Yield prediction (`/api/predictions/*`) | **done** - `POST /yield`, `GET /history`, `GET /:id`; validates -> calls ml-service `/predict/yield` -> stores -> returns |
| Recommendations (`/api/recommendations/*`) | **done** - `POST /crop`, `POST /irrigation`, `GET /history?kind=`, `GET /:id`; validate -> ml-service `/recommend/*` -> store `Recommendation` -> return |
| KrishiAI assistant (`/api/assistant/chat`) | **done** - Bearer, rate-limited. Proxies to any OpenAI-compatible chat API (`ASSISTANT_API_*` env); rule-based fallback when no key. |
| Farms, fertilizer rec, weather proxy, dashboard, admin | **not built** (later phases) |

## Setup

```bash
cd backend
npm install
cp .env.example .env          # adjust MONGO_URI / JWT_SECRET / ML_SERVICE_URL
npm run dev                    # nodemon-style via node --watch
```

Requires a local MongoDB (`mongod`) unless you point `MONGO_URI` elsewhere.
The ML service should be running for real predictions:
`cd ../ml-service && uvicorn app:app --port 8001`.

```bash
npm test        # in-memory Mongo + stub ML; no services required
```

## Endpoints

Base URL `http://localhost:4000/api`. Envelope: `{ success, message, data }`
(errors: `{ success:false, message, error }`).

### Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | `name, password, email?/phone?, state?, district?, preferredLanguage?, farmSize?, farmSizeUnit?` | -> `{ user, token }`, role `farmer` |
| POST | `/auth/login` | `identifier` (email or phone), `password` | -> `{ user, token }` |
| POST | `/auth/logout` | - | JWT is stateless; client discards the token |
| GET | `/auth/me` | - (Bearer) | -> current `user` |
| PUT | `/auth/profile` | subset of `name, state, district, preferredLanguage, farmSize, farmSizeUnit, location` | -> updated `user` |
| POST | `/auth/forgot-password` | `identifier` | always `{ sent: true }` |

Demo admin (seeded on first boot unless `SEED_DEMO_ADMIN=false`):
`admin@hackriculture.test` / `admin1234`.

### Predictions (Bearer required)

**`POST /predictions/yield`**

Required: `crop` (rice|wheat|maize|cotton|sugarcane|soybean|groundnut|potato),
`state` (Indian state, lower-case), `season`
(kharif|rabi|summer|autumn|winter|whole_year), `farmSize` (ha).

Optional: `cropYear, rainfall, fertilizerPerHa, pesticidePerHa` (regional
context) and `soilType, growthStage, nitrogen, phosphorus, potassium, soilPH,
temperature, humidity, sowMonth, previousYield` (agronomic adjustment inputs).

Response `data`:

```jsonc
{
  "id": "...", "createdAt": "...",
  "predictedYield": 3.42, "unit": "tons/hectare",
  "yieldRange": [2.6, 4.24], "expectedProduction": 10.26,
  "predictionQuality": 78,                 // 0-100 model score, NOT a probability
  "predictionQualityLabel": "high",        // high | medium | low
  "riskLevel": "low",                      // low | moderate | high
  "coreYield": 3.5, "adjustmentFactor": 0.977,
  "adjustmentInputsUsed": ["ph", "npk"], "adjustmentDetail": [ ... ],
  "referenceYield": 1.68,
  "importantFactors": [ { "label": "Soil pH", "impact_t_ha": -0.03, "source": "agronomic input", ... } ],
  "responseCurves": { "rainfall": [...], "temperature": [...] },
  "modelVersion": "...", "modelSource": "gbm",
  "disclaimer": "Estimate only. ... verify with a local agricultural expert and a current soil test."
}
```

**`GET /predictions/history?type=yield&page=1&limit=20`** -> `{ items, page, limit, total, pages }`
(the caller's own predictions, newest first).

**`GET /predictions/:id`** -> one stored prediction.

### Recommendations (Bearer required)

**`POST /recommendations/crop`** - body `nitrogen, phosphorus, potassium,
temperature, humidity, soilPH, rainfall` (required), optional `soilType,
season, topN` (default 3). Returns `{ recommendations: [{ crop,
suitabilityScore, expectedYield, waterRequirement, durationDays,
whyRecommended, matchedConditions, expectedProfit: null, profitNote }],
alternatives, modelVersion, disclaimer }`.

**`POST /recommendations/irrigation`** - body `crop` (required), optional
`soilType, growthStage, soilMoisture, temperature, humidity, rainfall,
forecastRainProbability, farmSize, irrigationType`. Returns `{ irrigationNeed
("Low"|"Medium"|"High"), needConfidence, priority, waterRequirement: {
netDepthMm, grossDepthMm, litresPerHectare, totalVolumeM3, text },
nextIrrigation, duration, rainfallAdjustment, reason, assumptions, modelVersion,
disclaimer }`.

**`GET /recommendations/history?kind=crop|irrigation&page=&limit=`**,
**`GET /recommendations/:id`**.

### Assistant (Bearer required)

**`POST /assistant/chat`** - body `{ messages: [{ role: "user"|"assistant",
content }] }` (1-20 messages, `content` <= 2000 chars). Returns `{ reply,
source: "llm" | "rules" }`. When `ASSISTANT_API_KEY` is set the backend forwards
the thread (plus a farming system prompt) to `ASSISTANT_API_URL`; otherwise a
small rule-based helper answers. Rate-limited to 20/min.

### Health

`GET /api/health` -> `{ status, ml: { reachable, ... }, time }`.

## Layout

```
backend/src/
├── config/      env.js (all env access), db.js
├── constants/   agro.js (crop/state/season vocab - kept in sync with ml-service)
├── controllers/ authController.js, predictionController.js
├── middleware/  auth.js (JWT), validate.js (Zod), error.js
├── models/      User.js (bcrypt), Prediction.js
├── routes/      index.js, authRoutes.js, predictionRoutes.js
├── services/    mlService.js  (axios -> FastAPI; the only Python touch-point)
├── validators/  authValidator.js, yieldValidator.js
├── utils/       ApiError.js, ApiResponse.js, asyncHandler.js
├── app.js       express app (helmet, cors, morgan, rate-limit, routes, error handler)
├── seed.js      demo admin
└── server.js    connect db -> seed -> listen
```

## Wiring the frontend

Set `VITE_USE_MOCKS=false` in the repo-root `.env`; `VITE_API_BASE_URL` is
already `http://localhost:4000/api`. The existing `src/services/authService.js`
real branches match these routes. A `predictionService.js` for the yield module
is added with the Phase 5 frontend page.
