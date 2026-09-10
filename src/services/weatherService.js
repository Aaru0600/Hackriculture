/**
 * Weather data for the Weather Intelligence page and form auto-fill.
 *
 * Direct mode: calls Open-Meteo (free, keyless, CORS-enabled) from the browser.
 * Backend mode: calls GET /weather/bundle on the Node API, which proxies the
 * provider and keeps any key server-side (per the project architecture rules).
 * Any failure falls back to bundled mock data so dependent forms keep working.
 */
import { API_BASE_URL, ApiError, fetchWithTimeout } from './apiClient'
import { mockWeatherBundle } from '@/mock/weather'

const DIRECT = (import.meta.env.VITE_DIRECT_DATA_APIS ?? 'true').toString() === 'true'
const OPEN_METEO_URL =
  import.meta.env.VITE_OPEN_METEO_URL ?? 'https://api.open-meteo.com/v1/forecast'

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
].join(',')

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
].join(',')

function normalizeOpenMeteo(json, location) {
  const c = json.current ?? {}
  const d = json.daily ?? {}
  const daily = (d.time ?? []).map((date, i) => ({
    date,
    weatherCode: d.weather_code?.[i] ?? 0,
    tempMax: Math.round(d.temperature_2m_max?.[i] ?? 0),
    tempMin: Math.round(d.temperature_2m_min?.[i] ?? 0),
    precipitationSum: Math.round((d.precipitation_sum?.[i] ?? 0) * 10) / 10,
    precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
    windMax: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
  }))

  return {
    location,
    current: {
      temperature: Math.round(c.temperature_2m ?? 0),
      apparentTemperature: Math.round(c.apparent_temperature ?? c.temperature_2m ?? 0),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      precipitation: Math.round((c.precipitation ?? 0) * 10) / 10,
      rainProbability: daily[0]?.precipitationProbability ?? 0,
      windSpeed: Math.round(c.wind_speed_10m ?? 0),
      weatherCode: c.weather_code ?? 0,
      time: c.time ?? new Date().toISOString(),
    },
    daily,
    provider: 'Open-Meteo',
    isMock: false,
  }
}

/**
 * Fetch current conditions + 7-day daily forecast for a location.
 * @param {{ latitude:number, longitude:number, name?:string, admin1?:string }} location
 * @returns {Promise<{ location:object, current:object, daily:object[], provider:string, isMock:boolean }>}
 */
export async function getWeatherBundle(location) {
  const { latitude, longitude } = location

  try {
    if (!DIRECT) {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/weather/bundle?lat=${latitude}&lon=${longitude}`,
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) {
        throw new ApiError(body.message || 'Weather request failed', res.status)
      }
      return { ...body.data, location }
    }

    const url =
      `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&current=${CURRENT_FIELDS}&daily=${DAILY_FIELDS}` +
      `&timezone=auto&forecast_days=7&wind_speed_unit=kmh`

    const res = await fetchWithTimeout(url, { timeout: 10000 })
    if (!res.ok) throw new ApiError(`Weather provider error (${res.status})`, res.status)
    const json = await res.json()
    return normalizeOpenMeteo(json, location)
  } catch (err) {
    // Keep the app usable: return synthetic data flagged as mock.
    if (import.meta.env.DEV) console.warn('[weatherService] falling back to mock:', err)
    return mockWeatherBundle(location)
  }
}
