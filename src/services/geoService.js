/**
 * Location lookup for the weather / auto-fill features.
 *
 * Direct mode (VITE_DIRECT_DATA_APIS=true): calls Open-Meteo geocoding and
 * BigDataCloud reverse geocoding straight from the browser - both are free and
 * need no key. Backend mode: calls /geo/search and /geo/reverse on the Node
 * API, which will proxy the same providers.
 */
import { API_BASE_URL, ApiError, fetchWithTimeout } from './apiClient'

const DIRECT = (import.meta.env.VITE_DIRECT_DATA_APIS ?? 'true').toString() === 'true'
const GEOCODING_URL =
  import.meta.env.VITE_GEOCODING_URL ?? 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL =
  import.meta.env.VITE_REVERSE_GEOCODE_URL ??
  'https://api.bigdatacloud.net/data/reverse-geocode-client'

async function getJson(url) {
  const res = await fetchWithTimeout(url, { timeout: 8000 })
  if (!res.ok) throw new ApiError(`Location lookup failed (${res.status})`, res.status)
  return res.json()
}

/**
 * Search places by name. Returns [{ id, name, admin1, country, latitude, longitude }].
 * @param {string} query
 * @param {string} [lang] active UI language, for localised place names
 */
export async function searchPlaces(query, lang = 'en') {
  const q = query.trim()
  if (q.length < 2) return []

  if (!DIRECT) {
    const body = await getJson(
      `${API_BASE_URL}/geo/search?q=${encodeURIComponent(q)}&lang=${lang}`,
    )
    return body.data ?? []
  }

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`
  const data = await getJson(url)
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1 ?? '',
    country: r.country ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

/**
 * Turn coordinates into a readable place name.
 * @returns {Promise<{ name: string, admin1: string, country: string }>}
 */
export async function reverseGeocode(latitude, longitude, lang = 'en') {
  if (!DIRECT) {
    const body = await getJson(
      `${API_BASE_URL}/geo/reverse?lat=${latitude}&lon=${longitude}&lang=${lang}`,
    )
    return body.data
  }

  try {
    const data = await getJson(
      `${REVERSE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=${lang}`,
    )
    return {
      name: data.locality || data.city || data.principalSubdivision || 'Selected location',
      admin1: data.principalSubdivision ?? '',
      country: data.countryName ?? '',
    }
  } catch {
    // Reverse geocoding is a nice-to-have; fall back to coordinates.
    return {
      name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      admin1: '',
      country: '',
    }
  }
}
