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

const _cardCache = new Map() // task -> { at, data }
const MODEL_INFO_TTL = 60_000

/** GET /model-info?task=yield|crop|irrigation  — the flat model card, cached 1 min. */
export async function getModelCard(task = 'yield') {
  const hit = _cardCache.get(task)
  if (hit && Date.now() - hit.at < MODEL_INFO_TTL) return hit.data
  const { data } = await axios.get(url(`/model-info?task=${encodeURIComponent(task)}`), cfg())
  _cardCache.set(task, { at: Date.now(), data })
  return data
}

/** Best-effort model cards for all three tasks; missing ones come back null. */
export async function getAllModelCards() {
  const tasks = ['yield', 'crop', 'irrigation']
  const results = await Promise.allSettled(tasks.map((t) => getModelCard(t)))
  const out = {}
  let reachable = false
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') { out[tasks[i]] = r.value; reachable = true }
    else out[tasks[i]] = null
  })
  return { cards: out, reachable }
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
