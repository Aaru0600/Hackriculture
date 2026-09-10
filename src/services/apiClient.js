/**
 * Thin API layer.
 *
 * Every feature service (auth, predictions, weather, ...) imports from here.
 * Today it resolves mock data locally; flip VITE_USE_MOCKS=false and the same
 * call signatures hit the real Node/Express backend via fetch. No component
 * needs to change when that switch happens.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export const USE_MOCKS =
  (import.meta.env.VITE_USE_MOCKS ?? 'true').toString() === 'true'

const MOCK_LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY ?? 600)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wrap a mock payload so it behaves like an async network call and matches the
 * backend's `{ success, message, data }` envelope from the spec.
 *
 * @template T
 * @param {T | (() => T)} payload
 * @param {{ message?: string, latency?: number, failRate?: number }} [opts]
 * @returns {Promise<{ success: true, message: string, data: T }>}
 */
export async function mockResponse(payload, opts = {}) {
  const { message = 'OK', latency = MOCK_LATENCY, failRate = 0 } = opts
  await delay(latency + Math.random() * 150)

  if (failRate > 0 && Math.random() < failRate) {
    throw new ApiError('Mock service is temporarily unavailable', 503)
  }

  const data = typeof payload === 'function' ? payload() : payload
  return { success: true, message, data }
}

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * fetch() with an abort timeout. Third-party data providers (SoilGrids in
 * particular) can hang; without this a pending promise would leave loading
 * spinners and dependent forms stuck forever.
 * @param {string} url
 * @param {RequestInit & { timeout?: number }} [options]
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeout = 12000, ...rest } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeout} ms`, 408)
    }
    throw new ApiError('Network error', 0)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Real network request. Used when USE_MOCKS is false.
 * @param {string} path e.g. "/predictions/yield"
 * @param {RequestInit & { auth?: boolean }} [options]
 */
export async function request(path, options = {}) {
  const { auth = true, headers, ...rest } = options
  const token = auth ? localStorage.getItem('hk_token') : null

  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...rest,
    })
  } catch {
    throw new ApiError('Network error - could not reach the server', 0)
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    throw new ApiError(
      body.message || `Request failed (${res.status})`,
      res.status,
      body.error ?? null,
    )
  }
  return body
}
