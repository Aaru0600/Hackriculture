/**
 * Server-side proxy for the keyless public data providers the frontend used to
 * call directly (Open-Meteo forecast + geocoding, ISRIC SoilGrids, BigDataCloud
 * reverse geocode). Keeping them here lets the frontend run with
 * VITE_DIRECT_DATA_APIS=false so the browser makes no cross-origin calls, and
 * gives one place to add caching / keys later.
 *
 * Every function degrades to a clearly-labelled sample on provider failure so a
 * route never 5xxs and the farmer's form never hangs.
 */
import axios from 'axios'
import { env } from '../config/env.js'

const OPEN_METEO_URL = env.OPEN_METEO_URL ?? 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_ARCHIVE_URL = env.OPEN_METEO_ARCHIVE_URL ?? 'https://archive-api.open-meteo.com/v1/archive'
const GEOCODING_URL = env.GEOCODING_URL ?? 'https://geocoding-api.open-meteo.com/v1/search'
const SOILGRIDS_URL = env.SOILGRIDS_URL ?? 'https://rest.isric.org/soilgrids/v2.0/properties/query'
const REVERSE_URL = env.REVERSE_GEOCODE_URL ?? 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const http = axios.create({ timeout: env.DATA_TIMEOUT_MS ?? 9000 })

const round = (n, d = 0) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

/* ------------------------------- weather -------------------------------- */

const CURRENT_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
  'precipitation', 'weather_code', 'wind_speed_10m',
].join(',')
const DAILY_FIELDS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_sum', 'precipitation_probability_max', 'wind_speed_10m_max',
].join(',')

function normalizeWeather(json) {
  const c = json.current ?? {}
  const d = json.daily ?? {}
  const daily = (d.time ?? []).map((date, i) => ({
    date,
    weatherCode: d.weather_code?.[i] ?? 0,
    tempMax: round(d.temperature_2m_max?.[i] ?? 0),
    tempMin: round(d.temperature_2m_min?.[i] ?? 0),
    precipitationSum: round(d.precipitation_sum?.[i] ?? 0, 1),
    precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
    windMax: round(d.wind_speed_10m_max?.[i] ?? 0),
  }))
  return {
    current: {
      temperature: round(c.temperature_2m ?? 0),
      apparentTemperature: round(c.apparent_temperature ?? c.temperature_2m ?? 0),
      humidity: round(c.relative_humidity_2m ?? 0),
      precipitation: round(c.precipitation ?? 0, 1),
      rainProbability: daily[0]?.precipitationProbability ?? 0,
      windSpeed: round(c.wind_speed_10m ?? 0),
      weatherCode: c.weather_code ?? 0,
      time: c.time ?? new Date().toISOString(),
    },
    daily,
    provider: 'Open-Meteo',
    isMock: false,
  }
}

function sampleWeather() {
  const today = new Date()
  const daily = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today)
    dt.setDate(today.getDate() + i)
    return {
      date: dt.toISOString().slice(0, 10),
      weatherCode: i % 3 === 0 ? 61 : 2,
      tempMax: 31 - (i % 3), tempMin: 21 - (i % 2),
      precipitationSum: i % 3 === 0 ? 6 : 0,
      precipitationProbability: i % 3 === 0 ? 60 : 15,
      windMax: 12 + (i % 4),
    }
  })
  return {
    current: {
      temperature: 29, apparentTemperature: 31, humidity: 62, precipitation: 0,
      rainProbability: daily[0].precipitationProbability, windSpeed: 11,
      weatherCode: 2, time: today.toISOString(),
    },
    daily,
    provider: 'sample (providers unavailable)',
    isMock: true,
  }
}

export async function weatherBundle(lat, lon) {
  try {
    const { data } = await http.get(OPEN_METEO_URL, {
      params: {
        latitude: lat, longitude: lon,
        current: CURRENT_FIELDS, daily: DAILY_FIELDS,
        timezone: 'auto', forecast_days: 7, wind_speed_unit: 'kmh',
      },
    })
    return normalizeWeather(data)
  } catch {
    return sampleWeather()
  }
}

/**
 * Total precipitation over the trailing ~365 days (Open-Meteo archive API), a
 * usable "annual rainfall" figure for the yield form. Returns
 * { annualRainfallMm, from, to, isMock }; falls back to a regional-ish sample.
 */
export async function annualRainfall(lat, lon) {
  const end = new Date(Date.now() - 6 * 864e5)          // archive lags ~5 days
  const start = new Date(end.getTime() - 365 * 864e5)
  const iso = (d) => d.toISOString().slice(0, 10)
  try {
    const { data } = await http.get(OPEN_METEO_ARCHIVE_URL, {
      params: {
        latitude: lat, longitude: lon,
        start_date: iso(start), end_date: iso(end),
        daily: 'precipitation_sum', timezone: 'auto',
      },
    })
    const sums = data.daily?.precipitation_sum ?? []
    const total = sums.reduce((a, v) => a + (v ?? 0), 0)
    if (!sums.length) return { annualRainfallMm: 1000, from: iso(start), to: iso(end), isMock: true }
    return { annualRainfallMm: Math.round(total), from: iso(start), to: iso(end), isMock: false }
  } catch {
    return { annualRainfallMm: 1000, from: iso(start), to: iso(end), isMock: true }
  }
}

/* ------------------------------- geocode -------------------------------- */

export async function geoSearch(query, lang = 'en') {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  try {
    const { data } = await http.get(GEOCODING_URL, {
      params: { name: q, count: 6, language: lang, format: 'json' },
    })
    return (data.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      admin1: r.admin1 ?? '',
      country: r.country ?? '',
      latitude: r.latitude,
      longitude: r.longitude,
    }))
  } catch {
    return []
  }
}

export async function geoReverse(lat, lon, lang = 'en') {
  try {
    const { data } = await http.get(REVERSE_URL, {
      params: { latitude: lat, longitude: lon, localityLanguage: lang },
    })
    return {
      name: data.locality || data.city || data.principalSubdivision || 'Selected location',
      admin1: data.principalSubdivision ?? '',
      country: data.countryName ?? '',
    }
  } catch {
    return { name: `${round(lat, 2)}, ${round(lon, 2)}`, admin1: '', country: '' }
  }
}

/* -------------------------------- soil --------------------------------- */

const SOIL_PROPS = ['phh2o', 'nitrogen', 'soc', 'sand', 'silt', 'clay']

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
  const depth = layer.depths?.find((x) => x.label === depthLabel) ?? layer.depths?.[0]
  const raw = depth?.values?.mean
  return raw == null ? null : raw / dFactor
}

function sampleSoil() {
  return {
    soilPH: 6.6,
    totalNitrogen: 1.4,
    nitrogenLevelKey: 'medium',
    organicCarbon: 0.9,
    texture: { sand: 40, silt: 40, clay: 20 },
    soilTypeKey: 'loam',
    depth: '0-5cm',
    provider: 'sample (SoilGrids unavailable)',
    isMock: true,
  }
}

// SoilGrids is rate-limited and often slow/5xx. A point's soil barely changes
// hour to hour, so a short in-memory cache (~0.01deg ~ 1.1km buckets) turns
// repeat lookups for the same field into instant hits instead of re-rolling
// the flaky provider every time, and a longer per-call timeout + one retry
// gives a slow-but-alive response a real chance before falling back to the
// labelled sample.
const SOIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const SOIL_TIMEOUT_MS = 15000
const soilCache = new Map()

function soilCacheKey(lat, lon) {
  return `${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100}`
}

async function fetchSoilGrids(lat, lon) {
  const { data } = await http.get(SOILGRIDS_URL, {
    params: { lat, lon, depth: '0-5cm', value: 'mean' },
    paramsSerializer: (p) =>
      [...Object.entries(p).map(([k, v]) => `${k}=${v}`), ...SOIL_PROPS.map((x) => `property=${x}`)].join('&'),
    headers: { Accept: 'application/json' },
    timeout: SOIL_TIMEOUT_MS,
  })
  const layers = data.properties?.layers ?? []
  const ph = readMean(layers, 'phh2o')
  const nitrogen = readMean(layers, 'nitrogen')
  const soc = readMean(layers, 'soc')
  const sand = readMean(layers, 'sand')
  const silt = readMean(layers, 'silt')
  const clay = readMean(layers, 'clay')
  if (ph == null && nitrogen == null && soc == null && sand == null) return null

  const texture = {
    sand: sand == null ? null : round(sand),
    silt: silt == null ? null : round(silt),
    clay: clay == null ? null : round(clay),
  }
  return {
    soilPH: ph == null ? null : round(ph, 1),
    totalNitrogen: nitrogen == null ? null : round(nitrogen, 2),
    nitrogenLevelKey: nitrogenLevel(nitrogen),
    organicCarbon: soc == null ? null : round(soc / 10, 2),
    texture,
    soilTypeKey: classifyTexture(texture.sand, texture.silt, texture.clay),
    depth: '0-5cm',
    provider: 'SoilGrids (ISRIC)',
    isMock: false,
  }
}

export async function soilEstimate(lat, lon) {
  const key = soilCacheKey(lat, lon)
  const cached = soilCache.get(key)
  if (cached && Date.now() - cached.at < SOIL_CACHE_TTL_MS) return cached.value

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await fetchSoilGrids(lat, lon)
      if (result) {
        soilCache.set(key, { at: Date.now(), value: result })
        return result
      }
      break // provider responded but had no usable values - no point retrying
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return sampleSoil()
}
