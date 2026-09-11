/**
 * Soil property estimate for form auto-fill.
 *
 * Direct mode: calls ISRIC SoilGrids v2 (free, keyless, CORS-enabled) from the
 * browser. Backend mode: calls GET /soil/estimate on the Node API.
 *
 * IMPORTANT: SoilGrids is a ~250 m global model, not a field measurement. It
 * gives reliable pH and texture, and *total* soil nitrogen / organic carbon -
 * which is NOT the same as the plant-available N-P-K a soil-testing lab
 * reports. So we auto-fill pH, soil type and organic carbon, and show nitrogen
 * only as a coarse level. Always defer to a local soil test.
 */
import { API_BASE_URL, ApiError, fetchWithTimeout } from './apiClient'
import { mockSoilEstimate } from '@/mock/soil'

const DIRECT = (import.meta.env.VITE_DIRECT_DATA_APIS ?? 'true').toString() === 'true'
const SOILGRIDS_URL =
  import.meta.env.VITE_SOILGRIDS_URL ??
  'https://rest.isric.org/soilgrids/v2.0/properties/query'

const PROPERTIES = ['phh2o', 'nitrogen', 'soc', 'sand', 'silt', 'clay']

// SoilGrids is rate-limited and often slow/5xx. A point's soil barely changes
// hour to hour, so cache successful lookups (~0.01deg ~ 1.1km buckets) and
// give a slow-but-alive response a real chance with a longer timeout + retry
// before falling back to the labelled sample.
const SOIL_CACHE_KEY = 'hk_soil_cache'
const SOIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const SOIL_TIMEOUT_MS = 15000

function cacheKey(latitude, longitude) {
  return `${Math.round(latitude * 100) / 100},${Math.round(longitude * 100) / 100}`
}

function readCache(key) {
  try {
    const all = JSON.parse(localStorage.getItem(SOIL_CACHE_KEY) || '{}')
    const entry = all[key]
    if (entry && Date.now() - entry.at < SOIL_CACHE_TTL_MS) return entry.value
  } catch { /* noop */ }
  return null
}

function writeCache(key, value) {
  try {
    const all = JSON.parse(localStorage.getItem(SOIL_CACHE_KEY) || '{}')
    all[key] = { at: Date.now(), value }
    localStorage.setItem(SOIL_CACHE_KEY, JSON.stringify(all))
  } catch { /* noop */ }
}

/** Simplified USDA texture triangle -> our soilType i18n keys. */
export function classifyTexture(sand, silt, clay) {
  if ([sand, silt, clay].some((v) => v == null || Number.isNaN(v))) return 'unknown'
  if (clay >= 40) return 'clay'
  if (silt >= 80) return 'silt'
  if (sand >= 70 && clay < 15) return 'sandy'
  if (clay >= 27) return 'clayLoam'
  if (silt >= 50 && clay < 27) return 'siltLoam'
  if (sand >= 52 && clay < 20) return 'sandyLoam'
  return 'loam'
}

/** g/kg total soil nitrogen -> coarse level key. */
function nitrogenLevel(gPerKg) {
  if (gPerKg == null) return 'unknown'
  if (gPerKg < 1) return 'low'
  if (gPerKg < 2) return 'medium'
  return 'high'
}

function readMean(layers, name, depthLabel = '0-5cm') {
  const layer = layers.find((l) => l.name === name)
  if (!layer) return null
  const dFactor = layer.unit_measure?.d_factor ?? 1
  const depth = layer.depths?.find((d) => d.label === depthLabel) ?? layer.depths?.[0]
  const raw = depth?.values?.mean
  return raw == null ? null : raw / dFactor
}

/**
 * @param {{ latitude:number, longitude:number }} location
 * @returns {Promise<{ soilPH:number|null, totalNitrogen:number|null, nitrogenLevelKey:string,
 *   organicCarbon:number|null, texture:{sand:number,silt:number,clay:number}, soilTypeKey:string,
 *   provider:string, isMock:boolean }>}
 */
export async function getSoilEstimate(location) {
  const { latitude, longitude } = location

  try {
    if (!DIRECT) {
      let res
      try {
        res = await fetch(
          `${API_BASE_URL}/soil/estimate?lat=${latitude}&lon=${longitude}`,
        )
      } catch {
        throw new ApiError('Could not reach the soil service', 0)
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) {
        throw new ApiError(body.message || 'Soil request failed', res.status)
      }
      return { ...body.data, location }
    }

    const key = cacheKey(latitude, longitude)
    const cached = readCache(key)
    if (cached) return { ...cached, location }

    const query =
      `?lat=${latitude}&lon=${longitude}&depth=0-5cm&value=mean&` +
      PROPERTIES.map((p) => `property=${p}`).join('&')

    // SoilGrids is rate-limited and frequently returns transient 5xx/timeouts.
    // Give it a genuinely long timeout and one retry before the caller falls
    // back to a labelled estimate rather than leave the farmer staring at a
    // spinner indefinitely.
    let res
    try {
      res = await fetchWithTimeout(`${SOILGRIDS_URL}${query}`, {
        headers: { Accept: 'application/json' },
        timeout: SOIL_TIMEOUT_MS,
      })
    } catch {
      res = null
    }
    if (!res || !res.ok) {
      await new Promise((r) => setTimeout(r, 1000))
      res = await fetchWithTimeout(`${SOILGRIDS_URL}${query}`, {
        headers: { Accept: 'application/json' },
        timeout: SOIL_TIMEOUT_MS,
      })
    }
    if (!res.ok) throw new ApiError(`Soil provider error (${res.status})`, res.status)

    const json = await res.json()
    const layers = json.properties?.layers ?? []

    const ph = readMean(layers, 'phh2o')
    const nitrogen = readMean(layers, 'nitrogen') // g/kg total N
    const soc = readMean(layers, 'soc') // g/kg
    const sand = readMean(layers, 'sand') // %
    const silt = readMean(layers, 'silt')
    const clay = readMean(layers, 'clay')

    const texture = {
      sand: sand == null ? null : Math.round(sand),
      silt: silt == null ? null : Math.round(silt),
      clay: clay == null ? null : Math.round(clay),
    }

    // Empty payload (rate limit body, no-data point) -> use the labelled estimate.
    if (ph == null && nitrogen == null && soc == null && texture.sand == null) {
      throw new ApiError('SoilGrids returned no usable values', 502)
    }

    const estimate = {
      soilPH: ph == null ? null : Math.round(ph * 10) / 10,
      totalNitrogen: nitrogen == null ? null : Math.round(nitrogen * 100) / 100,
      nitrogenLevelKey: nitrogenLevel(nitrogen),
      organicCarbon: soc == null ? null : Math.round((soc / 10) * 100) / 100, // %
      texture,
      soilTypeKey: classifyTexture(texture.sand, texture.silt, texture.clay),
      depth: '0-5cm',
      provider: 'SoilGrids (ISRIC)',
      isMock: false,
    }
    writeCache(key, estimate)
    return { location, ...estimate }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[soilService] falling back to mock:', err)
    return mockSoilEstimate(location)
  }
}
