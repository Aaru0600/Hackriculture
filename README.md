# HACKRICULTURE - Frontend

AI-Powered Smart Farming & Crop Intelligence Platform. React.js single-page app
for Indian farmers, students, researchers and agricultural officers.

> This repo is the **frontend only**. It talks to a Node.js + Express backend
> (which in turn calls a Python FastAPI ML service). Until that backend is
> running, the app serves data from a local mock layer.

## Tech stack

| Area        | Choice                                              |
| ----------- | -------------------------------------------------- |
| Build tool  | Vite                                               |
| Framework   | React 19 (JavaScript, no TypeScript)              |
| Routing     | react-router-dom                                   |
| Styling     | Tailwind CSS v4 (design tokens in `src/index.css`) |
| Charts      | Recharts                                           |
| Animation   | Framer Motion (subtle, respects reduced-motion)   |
| Icons       | lucide-react                                       |
| i18n        | i18next + react-i18next (7 languages, see below)   |
| Live data   | Open-Meteo (weather), SoilGrids/ISRIC (soil), keyless |

## Getting started

```bash
npm install
cp .env.example .env   # already done on first setup
npm run dev            # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Environment variables

See `.env.example`.

| Variable             | Purpose                                                |
| -------------------- | ---------------------------------------------------- |
| `VITE_API_BASE_URL`  | Base URL of the Node/Express backend                 |
| `VITE_USE_MOCKS`     | `true` = serve `src/mock/*` instead of calling the API |
| `VITE_MOCK_LATENCY`  | Simulated network delay (ms) so loading states show  |
| `VITE_DIRECT_DATA_APIS` | `true` = weather/soil fetched straight from the public providers; `false` = via the Node backend (`/weather`, `/soil`) |
| `VITE_OPEN_METEO_URL` / `VITE_GEOCODING_URL` | Open-Meteo forecast + geocoding endpoints |
| `VITE_SOILGRIDS_URL` | ISRIC SoilGrids v2 property query endpoint            |
| `VITE_REVERSE_GEOCODE_URL` | BigDataCloud reverse geocoding (coords → place)  |

## Internationalization

Seven languages, each with a **complete** locale file
(`src/i18n/locales/*.json`), so switching language re-renders the whole UI:
English, Hindi, Punjabi, Marathi, Tamil, Telugu, Bengali. English is the
fallback for any missing key. The regional translations are machine-assisted -
run a native-speaker review before release. Day names and times are formatted
per-locale via `Intl`, not translated by hand.

## Live data auto-fill (weather + soil)

So the farmer doesn't type values that can be looked up:

- **Weather** - `src/services/weatherService.js` → Open-Meteo (free, keyless,
  CORS-enabled). Current conditions + 7-day daily forecast. Powers the Weather
  Intelligence page and `deriveFarmAlerts()` in `src/lib/farmAlerts.js`.
- **Location** - `src/services/geoService.js` → Open-Meteo geocoding (search)
  and BigDataCloud (reverse). `useGeolocation` hook wraps the browser GPS API.
- **Soil** - `src/services/soilService.js` → ISRIC SoilGrids v2. Returns pH,
  texture → soil-type class, organic carbon and an indicative nitrogen level.
  SoilGrids is a ~250 m model and frequently rate-limited/down, so a failed or
  empty response falls back to a clearly-labelled sample estimate. It is **not**
  a substitute for a lab soil test - the UI says so.

**Architecture note.** The project spec says React must not call external APIs
directly. In this frontend-only phase it does, but only providers that need
**no API key** (nothing secret is exposed), and every call goes through a
service function. When the Node backend exists, set `VITE_DIRECT_DATA_APIS=false`
and those same functions call `/weather`, `/soil`, `/geo/*` on the backend,
which then holds any keys and adds caching/rate-limit handling. Every live call
has an abort timeout and a mock fallback, so forms never hang.

## Project structure

```
src/
├── components/        Reusable UI
│   ├── ui/            Primitives: Button, Card, Badge, Container, SectionHeading, Logo
│   └── landing/       Landing-page sections
├── components/weather/  Weather page widgets (current, forecast, alerts, soil)
├── data/              Static config (feature list, ...)
├── hooks/             Shared React hooks (useGeolocation, useClickOutside)
├── i18n/              i18next config + 7 locale JSON files
├── layouts/           Shell layouts (dashboard, auth) - added in later phases
├── lib/               cn(), motion presets, wmo codes, farmAlerts rules
├── mock/              Mock datasets / offline fallbacks
├── pages/             Route components (LandingPage, WeatherPage, ...)
├── routes/            paths.js (route table) + AppRoutes.jsx (lazy pages)
├── services/          apiClient + weather / soil / geo / feature services
├── App.jsx            Router + Suspense
└── main.jsx           Entry, loads i18n + global CSS
```

## API layer

Every feature calls a function in `src/services/*`. Those resolve mock data
today; set `VITE_USE_MOCKS=false` and the same calls hit the real backend via
`request()` in `apiClient.js`. Prediction logic is never in the frontend.

## Build status

- [x] Phase 1 - Scaffold, design system, landing page
- [x] Phase 2 - 7-language i18n + live weather/soil data layer + Weather Intelligence page
- [x] Phase 3 - Authentication (login / register / forgot-password) + route guards
- [x] Phase 4 - Farmer dashboard shell (sidebar / topbar / mobile bottom-nav) + KPI cards + farm health + AI insight
- [x] Phase 5 - Crop yield prediction: ML service + Node backend + React page (`ml-service/`, `backend/`, `src/pages/CropPredictionPage.jsx`)
- [x] Phase 6 - Crop recommendation + fertilizer + irrigation: ML models + Node backend + React pages (`src/pages/{CropRecommendation,Fertilizer,Irrigation}Page.jsx`). Fertilizer is rule-based (no model, per spec).
- [x] Phase 7 - History & Analytics page + Farming Alerts feed (`/alerts`) + My Farm (`/my-farm`, farm CRUD: `backend/src/{models,controllers,routes,validators}` + `src/pages/MyFarmPage.jsx`)
- [x] Phase 8 - KrishiAI assistant (bottom-left chat, voice input, `/api/assistant/chat`) + voice navigation + location auto-fill + feature docs
- [x] Phase 9 - Admin panel (`/admin/*` in its own AdminShell: overview / users / datasets / ML models / reports) + `backend/src/routes/adminRoutes.js`
- [x] Phase 10 - Print / "Save as PDF" reports (predictions + admin reports, `@media print`), mobile bottom-nav (reviewed - safe-area + active pill already in place), Profile page (`/profile`), premium plan surface (Profile)
- [x] Backend completion - farm CRUD, `GET /api/dashboard` aggregate, `GET/PUT /api/alerts`, weather/geo/soil proxy (`/api/weather`, `/api/geo`, `/api/soil`), `POST /api/recommendations/fertilizer`, `PUT /api/auth/password`, admin API, Swagger UI at `/api/docs`, Dockerfiles + `docker-compose.yml`

## Authentication

Frontend auth is fully wired against the mock layer:

- `src/context/AuthContext.jsx` - `useAuth()` gives `{ user, status, isAuthenticated, isAdmin, login, register, logout, updateUser }`. `status` is `loading` until the stored session resolves.
- `src/services/authService.js` - mock mode keeps a `localStorage` account store (`hk_users`), issues a fake token, and supports register / login / logout / me / profile / forgot-password. **Passwords are only obfuscated, not hashed** - real bcrypt + JWT live in the Node backend. Flip `VITE_USE_MOCKS=false` and the same functions call `POST /auth/register`, `POST /auth/login`, etc.
- `src/routes/RequireAuth.jsx` - `<RequireAuth>` gates signed-in routes (remembers the intended URL); `<RequireAdmin>` gates `/admin/*` and bounces farmers to their dashboard.
- Pages: `src/pages/auth/{LoginPage,RegisterPage,ForgotPasswordPage}.jsx` on the two-pane `AuthLayout`. Registration captures name, email/mobile, password, state (dropdown), district (free text, "use my location" prefill), preferred language, and farm size + unit.
- Form plumbing: `useForm` hook + `src/lib/validation.js` validators (return i18n keys) + `FormInput` / `SelectInput` / `PasswordInput` / `Checkbox` primitives.

**Demo login (dev only):** `admin@hackriculture.test` / `admin1234` (seeded admin, shown as a hint on the login page).

## Dashboard shell

Every signed-in route renders inside `src/components/dashboard/DashboardLayout.jsx`:

- **Desktop** - fixed left sidebar (`DashboardSidebar`) with the 10 nav items + an Admin link for admins + a user card with sign-out; slim `DashboardTopbar` (page title, language, avatar).
- **Mobile** - the sidebar becomes a slide-in drawer (hamburger in the topbar) and a fixed 5-item `MobileBottomNav` (Home / Predict / Advise / Weather / Profile).

`src/pages/DashboardPage.jsx` composes: time-aware greeting, **AI Insight of the Day** (uses the top weather alert when a saved location exists, else a rotating tip), farm summary (size / crop / soil / location / growth stage), four **KPI cards** (`KpiCard` - value, delta chip, inline-SVG `Sparkline`), today's-weather card (reuses the Phase 2 weather service + `hk_location`), **Farm Health Score** (`RadialGauge` + breakdown bars), a compact farming-alerts list, and quick-action tiles. Data comes from `src/services/dashboardService.js` (`getDashboard`), shaped like the spec's `GET /api/dashboard`.

New reusable primitives: `RadialGauge` (circular progress, also for the yield-confidence dial later) and `Sparkline` (Recharts stays reserved for the History page's full charts).

## Phase 5 - Crop yield prediction (in progress)

Expanded by request into a full stack: React module -> Node/Express backend ->
Python FastAPI ML service with a trained model.

### `ml-service/` - done (hybrid, real data)

FastAPI service serving **yield in t/ha**. Two stages:

```
core  = real-data model( crop, state, season, year, area,
                         annual rainfall, fertiliser/ha, pesticide/ha )
point = core  x  agronomic_adjustment( soil N-P-K, pH, temperature,
                                       humidity, soil type, growth stage )
```

- **Core model** - `HistGradientBoostingRegressor` (sklearn `Pipeline`, one-hot
  categoricals) on `log1p(yield)`, trained on a **real public dataset**: Kaggle
  *Crop Yield in Indian States* (`data/raw/crop_yield.csv`, state-year
  aggregates 1997-2020). `src/prepare_real_data.py` cleans it to ~5,150 rows
  across 8 crops (+ `data/data_source.json`, `synthetic: false`). Hold-out:
  **R2 0.96, MAE 1.2 t/ha, MAPE 18%**; 5-fold CV R2 (log) 0.98. It predicts a
  regional average - it has no plot-level soil chemistry.
- **Agronomic adjustment** - `src/agronomy.py`, transparent response curves
  (law-of-the-minimum on N-P-K, bell curves for pH / temperature / humidity).
  Turns the farmer's soil-test inputs into a multiplier clamped 0.72-1.15;
  missing inputs -> 1.0 (a no-op, and the response says so).
- ~80% interval from the relative residual spread (coverage 0.87); a
  per-prediction **reliability score** (never called *confidence*) from how
  ordinary the inputs are. Influencing factors = adjustment parts + rainfall /
  fertiliser sensitivity (`crop` / `state` / `area` / `year` excluded as
  givens). Response curves for rainfall (core) and temperature (agronomic).
- Every prediction still carries the "verify with a local expert / soil test"
  disclaimer; `models/model_card.json` has the dataset hash + all metrics.
- **Endpoints**: `GET /health`, `GET /model-info`, `POST /predict/yield`
  (only `crop`, `state`, `season`, `farm_size_ha` required). Called only by the
  Node backend. See `ml-service/README.md`.

### `backend/` - done (auth + yield slice)

Node/Express + Mongoose, ESM. `cd backend && npm install && npm run dev`
(port 4000, needs local MongoDB). Envelope `{ success, message, data }`.

- **Auth** (`/api/auth/*`): register / login / logout / me / profile /
  forgot-password. bcrypt + JWT, Zod validation, rate-limited. Seeds the demo
  admin (`admin@hackriculture.test` / `admin1234`) on first boot. Matches the
  existing `src/services/authService.js` real-mode calls.
- **Yield** (`/api/predictions/*`, Bearer): `POST /yield` validates -> maps
  camelCase to the ML service's snake_case -> `mlService.js` (axios, the only
  Python touch-point) -> stores a `Prediction` -> returns a camelCased result
  (spec's `predictedYield`, `predictionQuality` as a 0-100 model score +
  `predictionQualityLabel`, `riskLevel`, `importantFactors`, plus `coreYield`,
  `adjustmentFactor`, `responseCurves`, `disclaimer`). `GET /history`
  (paginated, per-user), `GET /:id`.
- ML failures surface as 502/503, never a fake number.
- Tests: `npm test` - 12 pass, Node's built-in runner + Supertest, in-memory
  MongoDB + stub ML server (no services needed). See `backend/README.md`.
- Not built yet: farms, recommendations, weather proxy, dashboard, admin.

### React yield module - done

`src/pages/CropPredictionPage.jsx` - a 4-step wizard (Farm -> Soil ->
Environment -> Crop; only crop / **state** / season / farm size are required)
feeding `src/services/predictionService.js`. `src/components/prediction/YieldResult.jsx`
renders the result: headline yield, a `RadialGauge` model-score dial (labelled
"model score", not confidence), likely range, risk badge, an influencing-factors
list, two Recharts curves (rainfall- and temperature-vs-yield from the ML
service), a JSON "Download report", and the disclaimer. `predict.*` i18n keys
are in all 7 locale files (English; regional needs a native pass). Flip
`VITE_USE_MOCKS=false` for the live backend.

## Phase 6 - Crop recommendation & irrigation (models + backend done)

Two more real datasets, two more models in `ml-service/`:

- **Crop recommendation** - `RandomForestClassifier` on N-P-K + temperature +
  humidity + pH + rainfall -> 22 crops (Kaggle *Crop Recommendation Dataset*,
  2,200 balanced rows). Hold-out **accuracy 0.99, top-3 accuracy 1.0**.
  `POST /recommend/crops` returns the ranked top N enriched with duration /
  water need / typical yield / a rule-based "why", plus alternatives.
  `expectedProfit` is deliberately `null` (market-dependent, not estimated).
- **Smart irrigation** - `RandomForestClassifier` (`class_weight=balanced`, the
  "High" class is ~3%) -> Low/Medium/High need, then a transparent rule layer
  for net/gross water depth, next-irrigation interval, run duration and a
  forecast-rain adjustment. `irrigation_prediction.csv` (10k rows). Hold-out
  **macro-F1 0.97**, High-class recall 0.85. `POST /recommend/irrigation`.

- **Fertilizer** - no ML model (the spec calls for a rule/hybrid approach).
  `src/mock/fertilizer.js` compares the entered soil N-P-K against a per-crop
  recommended dose and converts each gap into Urea / DAP / MOP quantities, plus
  a pH amendment note. Frontend-only for now; the service already targets a
  future `POST /api/recommendations/fertilizer`.

Node: `POST /api/recommendations/{crop,irrigation}` (Bearer) -> validate -> ML
service -> store a `Recommendation` -> camelCased result. `GET
/api/recommendations/history?kind=`, `GET /:id`. `npm test` -> 19 pass.

**React pages** (`src/pages/`): `CropPredictionPage`, `CropRecommendationPage`,
`FertilizerPage`, `IrrigationPage` - all wired into `AppRoutes.jsx` and
verified in the browser (mock mode). Each is a form -> result view using the
shared UI primitives, `RadialGauge` for scores, Recharts for the yield curves,
and carries the "verify with a local expert" disclaimer. i18n keys are in all
7 locale files (English; regional needs a native pass).

## Phase 7 - Farming Alerts feed & My Farm

### `backend/` - Farm CRUD

- `Farm` model (`user`, `farmName`, `area` + `areaUnit`, `location` + lat/lon,
  `soilType`, `irrigationType`, and a current-crop block: `currentCrop`,
  `cropSeason`, `sownOn`, `growthStage`, `expectedHarvest`). Owner-scoped.
- `GET/POST /api/farms`, `GET/PUT/DELETE /api/farms/:id` (Bearer). Zod
  validation (`farmCreateSchema` requires name + area; `farmUpdateSchema` is a
  no-defaults partial that needs >=1 field). Enum values are lower-cased on the
  way in. `IRRIGATION_TYPES` / `AREA_UNITS` added to `constants/agro.js`.
- `tests/farm.test.js` - auth, CRUD round-trip, owner isolation (other users
  get 404), partial update, validation. `npm test` -> **31 pass**.
- Still deferred: a server-side `Alert` model / `GET /api/alerts` (needs a
  weather proxy first) - the alerts feed is client-derived for now.

### React - My Farm (`/my-farm`)

`src/pages/MyFarmPage.jsx` replaces the placeholder. Farm switcher + add/edit
form (inline) + delete-with-confirm. **Farm Profile** card, **Current Crop**
card, and the spec's **Crop Timeline** stepper (`src/components/farm/CropTimeline.jsx`:
Land Prep -> Sowing -> Germination -> Vegetative -> Flowering -> Harvest, current
step from the stored `growthStage`). "Use my location" fills coordinates + a
reverse-geocoded place name. `src/services/farmService.js` + `src/mock/farms.js`
(localStorage-backed, so CRUD persists in a demo). `src/data/farmOptions.js`
holds the option lists + timeline map.

### React - Farming Alerts feed (`/alerts`)

`src/pages/AlertsPage.jsx` + `src/services/alertsService.js`. Aggregates
`deriveFarmAlerts()` across the saved weather location and every farm with
coordinates (one forecast fetch per unique coordinate), plus a fertiliser-window
reminder from `deriveFarmContextAlerts()` (new in `src/lib/farmAlerts.js`). Feed
is sorted unread-then-severity, has All / Unread filters, per-alert and
"mark all read" controls, and per-alert scope labels. Read state is per-browser
in `localStorage` (`hk_alerts_read`); the page says alerts come from the live
forecast, not a server. New sidebar nav item (Bell); not in the mobile bottom nav.

i18n: `myFarm.*`, `alerts.*`, `farmAlerts.fertilizerReminder`, `dashboard.nav.alerts`,
`common.cancel` added to all 7 locale files (English; regional needs a native pass).

## Phase 8 - assistant, voice, auto-fill, history, feature docs

- **KrishiAI assistant** - a chat bubble fixed to the bottom-left of every
  signed-in page (`AssistantWidget`). `POST /api/assistant/chat` on the backend
  proxies to any OpenAI-compatible LLM (`ASSISTANT_API_URL` / `_KEY` / `_MODEL`
  in `backend/.env` - Groq, OpenRouter, Gemini, local...). **Leave the key
  blank and a built-in rule-based farming helper answers** - zero setup. The
  key never reaches the browser. The chat box has a mic for spoken questions;
  the thread is kept in `localStorage`.
- **Voice navigation** - a mic button in the top bar (`VoiceNavButton` +
  `useVoiceNav`). Tap, say a page name ("crop prediction", "weather",
  "history"), and it navigates. Uses the browser's built-in `SpeechRecognition`
  - nothing is recorded or uploaded; hidden where unsupported.
- **Location auto-fill** - `LocationAutofill` on the yield and crop-recommendation
  forms. Pick a location (or GPS) and it pulls soil pH / type (SoilGrids) and
  current temperature / humidity (Open-Meteo) and reverse-geocodes the
  state/district, so the farmer isn't typing values that can be looked up. Every
  field stays editable and is clearly marked as an estimate, not a soil test.
- **District** - added as an optional field on the yield and recommendation
  forms; stored with the record, not used by the models.
- **Farming History** - `src/pages/HistoryPage.jsx` at `/history`: tabs for past
  predictions and recommendations, expandable rows, and a yield-trend chart once
  there are a few predictions. Reads the existing history endpoints.
- **Feature docs** - each card on the landing feature grid links to
  `/learn/<feature>` (`LearnPage` + `src/data/featureDocs.js`): a plain-language
  explainer of what the tool does, how the model works, how to read the result,
  and its limits.
- **ML bugfix** - a partial-soil yield request (soil pH but no rainfall) used to
  500 the ML service; fixed and covered by a regression test.

Tests after this phase: backend `npm test` **22 pass**, `ml-service` pytest
**12 pass**, frontend lint + `npm run build` clean.

## Phase 9 - Admin panel & backend completion

### Backend (now feature-complete against the spec)

`cd backend && npm test` -> **53 pass**. New in this pass:

- **Farm CRUD** - `Farm` model + `/api/farms` (Phase 7).
- **`GET /api/dashboard`** - farmer home aggregate. KPI + health values are
  *derived* from the user's own recent predictions / recommendations (never
  sensor data); missing signals fall back to a neutral 70 and the response
  carries `basis` + `isEstimated` so the UI can say so.
- **`GET /api/alerts`** + **`PUT /api/alerts/:id/read`** + `PUT /api/alerts/read-all`.
  `Alert` model + `services/alertEngine.js` (server twin of `src/lib/farmAlerts.js`).
  Alerts are regenerated from the current forecast for `user.location` and every
  farm with coordinates; `key` dedupes a condition per scope so the read flag
  survives regeneration; cleared conditions are pruned.
- **Data-provider proxy** - `GET /api/weather/bundle`, `/api/geo/search`,
  `/api/geo/reverse`, `/api/soil/estimate` (`services/dataProviders.js`, axios to
  Open-Meteo / SoilGrids / BigDataCloud). Every call degrades to a labelled
  sample on provider failure. Set `VITE_DIRECT_DATA_APIS=false` and the frontend
  uses these instead of calling providers from the browser.
- **`POST /api/recommendations/fertilizer`** - the rule engine
  (`services/fertilizerEngine.js`, twin of `src/mock/fertilizer.js`) moved
  server-side and stored as a `Recommendation` (`kind: 'fertilizer'`).
- **`PUT /api/auth/password`** - change password for the signed-in user.
- **Admin API** (`authenticate` + `requireAdmin`): `/api/admin/stats`,
  `/api/admin/users` (+ `PATCH` role, `DELETE` cascades their records),
  `/api/admin/predictions`, `/api/admin/recommendations`, `/api/admin/models`
  (live `/model-info` merged with an editable `ModelRecord`), and a `Dataset`
  registry CRUD (`/api/admin/datasets`). Dataset registry tracks *metadata* only
  - raw CSVs stay with the ML service; there is no file upload through the API.
- **Swagger UI** at `GET /api/docs` (+ `GET /api/docs.json`), from a
  hand-authored `src/docs/openapi.js`.

### Frontend

- **`/profile`** (`src/pages/ProfilePage.jsx`) - editable details (name, phone,
  state, district, language, default farm size), a password-change card, and a
  plan surface (Free; premium "coming soon"). Replaces the placeholder.
- **Admin panel** - its own `AdminShell` (tab bar, not the DashboardLayout):
  `src/pages/admin/{AdminDashboard,AdminUsers,AdminDatasets,AdminModels,AdminReports}Page.jsx`
  + `src/services/adminService.js` (real `/api/admin/*` + a mock branch backed by
  `hk_users` / `hk_farms` so the seeded demo admin can browse offline).
- **Print / "Save as PDF"** - `src/components/ui/PrintButton.jsx` + an
  `@media print` block in `index.css` that shows only `.printable` and hides app
  chrome. Wired into `YieldResult` and the admin Reports page.
- **Dashboard** made null-safe for the real `/api/dashboard` shape (KPIs and
  farm-summary fields render "—" when a value has not been generated yet).
- Alerts feed (`src/services/alertsService.js`) now has a real branch that reads
  `/api/alerts`; the client-derived path stays for mock mode.

### Docker

`Dockerfile` (frontend -> nginx, proxies `/api`), `backend/Dockerfile`,
`ml-service/Dockerfile` (+ `docker-entrypoint.sh` that trains missing models from
`data/raw/*.csv`), and `docker-compose.yml` (mongo + ml + api + web). Not built
on this machine (Docker not installed) - files are provided, unverified.

Tests after this phase: backend `npm test` **53 pass**, `ml-service` pytest
**12 pass** (unchanged), frontend `npm run build` clean, `npm run lint` exit 0
(10 known-benign `set-state-in-effect` warnings). UI browser-verified in mock
mode as the demo admin: My Farm, Alerts, Profile, all five Admin pages.
