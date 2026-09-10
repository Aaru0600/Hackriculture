/**
 * Central env access. Import `env` from here; never read process.env elsewhere.
 */
import 'dotenv/config'

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const NODE_ENV = process.env.NODE_ENV ?? 'development'
const isTest = NODE_ENV === 'test'

export const env = {
  NODE_ENV,
  isProd: NODE_ENV === 'production',
  isTest,
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  // In test we spin up an in-memory Mongo, so no URI is required.
  MONGO_URI: isTest
    ? (process.env.MONGO_URI ?? '')
    : required('MONGO_URI', 'mongodb://127.0.0.1:27017/hackriculture'),

  // Must be set in production; dev/test fall back to an insecure default.
  JWT_SECRET:
    NODE_ENV === 'production'
      ? required('JWT_SECRET')
      : (process.env.JWT_SECRET ?? 'dev-insecure-jwt-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',

  ML_SERVICE_URL: process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8001',
  ML_TIMEOUT_MS: Number(process.env.ML_TIMEOUT_MS ?? 8000),

  // Keyless public data providers (weather / geocode / soil) - overridable.
  OPEN_METEO_URL: process.env.OPEN_METEO_URL ?? 'https://api.open-meteo.com/v1/forecast',
  OPEN_METEO_ARCHIVE_URL: process.env.OPEN_METEO_ARCHIVE_URL ?? 'https://archive-api.open-meteo.com/v1/archive',
  GEOCODING_URL: process.env.GEOCODING_URL ?? 'https://geocoding-api.open-meteo.com/v1/search',
  SOILGRIDS_URL: process.env.SOILGRIDS_URL ?? 'https://rest.isric.org/soilgrids/v2.0/properties/query',
  REVERSE_GEOCODE_URL: process.env.REVERSE_GEOCODE_URL ?? 'https://api.bigdatacloud.net/data/reverse-geocode-client',
  DATA_TIMEOUT_MS: Number(process.env.DATA_TIMEOUT_MS ?? 9000),

  // KrishiAI assistant - any OpenAI-compatible chat-completions API.
  // Leave ASSISTANT_API_KEY blank to use the built-in rule-based helper.
  ASSISTANT_API_URL: process.env.ASSISTANT_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
  ASSISTANT_API_KEY: process.env.ASSISTANT_API_KEY ?? '',
  ASSISTANT_MODEL: process.env.ASSISTANT_MODEL ?? 'llama-3.1-8b-instant',
  ASSISTANT_TIMEOUT_MS: Number(process.env.ASSISTANT_TIMEOUT_MS ?? 20000),

  SEED_DEMO_ADMIN: (process.env.SEED_DEMO_ADMIN ?? 'true') === 'true',
  DEMO_ADMIN_EMAIL: process.env.DEMO_ADMIN_EMAIL ?? 'admin@hackriculture.test',
  DEMO_ADMIN_PASSWORD: process.env.DEMO_ADMIN_PASSWORD ?? 'admin1234',

  // Swagger UI at /api/docs. On by default; turn off in production
  // (DOCS_ENABLED=false) to avoid publishing the full API surface.
  DOCS_ENABLED: (process.env.DOCS_ENABLED ?? (NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
}
