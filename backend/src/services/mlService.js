/**
 * Thin client for the Python FastAPI ML service. The only place the backend
 * talks to Python. Never import Python or model code here.
 *
 * The base URL and timeout are read from `env` on every call so tests can point
 * it at a stub server.
 */
import axios from 'axios'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const cfg = () => ({
  timeout: env.ML_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})
const url = (path) => `${env.ML_SERVICE_URL.replace(/\/$/, '')}${path}`

function wrapError(err, action) {
  if (err.response) {
    const detail = err.response.data?.detail ?? err.response.data ?? null
    return ApiError.badGateway(`ML service rejected the ${action} request`, detail)
  }
  if (err.code === 'ECONNABORTED') {
    return ApiError.unavailable(`ML service timed out during ${action}`)
  }
  return ApiError.unavailable(`ML service is unreachable (${action})`)
}

/** POST /predict/yield  — payload is already snake_cased for Python. */
export async function predictYield(payload) {
  try {
    const { data } = await axios.post(url('/predict/yield'), payload, cfg())
    return data
  } catch (err) {
    throw wrapError(err, 'yield prediction')
  }
}

/** POST /recommend/crops */
export async function recommendCrops(payload) {
  try {
    const { data } = await axios.post(url('/recommend/crops'), payload, cfg())
    return data
  } catch (err) {
    throw wrapError(err, 'crop recommendation')
  }
}

/** POST /recommend/irrigation */
export async function recommendIrrigation(payload) {
  try {
    const { data } = await axios.post(url('/recommend/irrigation'), payload, cfg())
    return data
  } catch (err) {
    throw wrapError(err, 'irrigation recommendation')
  }
}

let _modelInfo = null
let _modelInfoAt = 0
const MODEL_INFO_TTL = 60_000

/** GET /model-info  — cached for a minute. */
export async function getModelInfo() {
  if (_modelInfo && Date.now() - _modelInfoAt < MODEL_INFO_TTL) return _modelInfo
  try {
    const { data } = await axios.get(url('/model-info'), cfg())
    _modelInfo = data
    _modelInfoAt = Date.now()
    return data
  } catch (err) {
    throw wrapError(err, 'model-info')
  }
}

/** GET /health — used by the backend's own /api/health. */
export async function mlHealth() {
  try {
    const { data } = await axios.get(url('/health'), { timeout: 3000 })
    return { reachable: true, ...data }
  } catch {
    return { reachable: false }
  }
}
