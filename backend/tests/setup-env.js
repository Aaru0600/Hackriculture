// Preloaded via `node --test --import`. Runs before the module graph, so
// config/env.js sees these when it is first evaluated.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET ??= 'test-secret'
process.env.SEED_DEMO_ADMIN = 'false'
process.env.ML_SERVICE_URL ??= 'http://127.0.0.1:9'

// Point the data-provider proxy at a dead port so tests exercise the labelled
// fallbacks instead of hitting the real Open-Meteo / SoilGrids endpoints.
process.env.OPEN_METEO_URL ??= 'http://127.0.0.1:9/forecast'
process.env.GEOCODING_URL ??= 'http://127.0.0.1:9/search'
process.env.SOILGRIDS_URL ??= 'http://127.0.0.1:9/soil'
process.env.REVERSE_GEOCODE_URL ??= 'http://127.0.0.1:9/reverse'
process.env.DATA_TIMEOUT_MS ??= '1200'
