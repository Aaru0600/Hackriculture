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

    const query =
      `?lat=${latitude}&lon=${longitude}&depth=0-5cm&value=mean&` +
      PROPERTIES.map((p) => `property=${p}`).join('&')

    // SoilGrids is rate-limited and frequently returns transient 5xx. Keep the
    // wait short - one quick retry only - then let the caller fall back to a
    // labelled estimate rather than leave the farmer staring at a spinner.
    let res = await fetchWithTimeout(`${SOILGRIDS_URL}${query}`, {
      headers: { Accept: 'application/json' },
      timeout: 8000,
    })
    if (!res.ok && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 800))
      res = await fetchWithTimeout(`${SOILGRIDS_URL}${query}`, {
        headers: { Accept: 'application/json' },
        timeout: 8000,
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

    return {
      location,
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
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[soilService] falling back to mock:', err)
    return mockSoilEstimate(location)
  }
}
