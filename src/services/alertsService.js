/**
 * Farming alerts feed.
 *
 * Real mode: GET /api/alerts on the Node backend, which regenerates alerts from
 * the current forecast for the user's saved location + farms and stores read
 * state server-side.
 * Mock mode: derived on the client from the live weather forecast (Open-Meteo,
 * via weatherService) for the saved location and every farm with coordinates,
 * plus a couple of crop-cycle reminders. Read state kept per browser.
 */
import { USE_MOCKS, request } from './apiClient'
import { getWeatherBundle } from './weatherService'
import { listFarms } from './farmService'
import { deriveFarmAlerts, deriveFarmContextAlerts, ALERT_ICONS } from '@/lib/farmAlerts'

const READ_KEY = 'hk_alerts_read'
const LOCATION_KEY = 'hk_location'
const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 }

/* ------------------------------- real mode ------------------------------ */

async function getAlertsReal() {
  const body = await request('/alerts')
  const items = (body.data.items ?? []).map((a) => ({
    ...a,
    icon: ALERT_ICONS[a.type],
    scopeKey: a.farm ? `farm:${a.farm}` : 'saved',
  }))
  return { alerts: items, generatedAt: body.data.generatedAt, scopes: items.length ? 1 : 0 }
}

/* ------------------------------- mock mode ------------------------------ */

function readSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function writeSet(set) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set])) } catch { /* storage off */ }
}
function savedLocation() {
  try { return JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null') } catch { return null }
}
const coordKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`

async function getAlertsMock() {
  const scopes = []
  const loc = savedLocation()
  if (loc?.latitude != null && loc?.longitude != null) {
    scopes.push({
      key: 'saved',
      label: [loc.name, loc.admin1].filter(Boolean).join(', ') || null,
      isSavedLocation: true, lat: loc.latitude, lon: loc.longitude, farm: null,
    })
  }

  let farms = []
  try { farms = (await listFarms()).items ?? [] } catch { /* offline */ }
  for (const f of farms) {
    if (f.latitude == null || f.longitude == null) continue
    scopes.push({
      key: `farm:${f.id}`, label: f.farmName, isSavedLocation: false,
      lat: f.latitude, lon: f.longitude, farm: f,
    })
  }

  const bundles = new Map()
  await Promise.all(
    [...new Map(scopes.map((s) => [coordKey(s.lat, s.lon), s])).values()].map(async (s) => {
      try {
        bundles.set(coordKey(s.lat, s.lon), await getWeatherBundle({ latitude: s.lat, longitude: s.lon }))
      } catch { /* no weather alerts for this scope */ }
    }),
  )

  const read = readSet()
  const alerts = []
  for (const s of scopes) {
    const bundle = bundles.get(coordKey(s.lat, s.lon))
    const derived = [
      ...(bundle ? deriveFarmAlerts(bundle) : []),
      ...(s.farm ? deriveFarmContextAlerts(s.farm) : []),
    ]
    for (const a of derived) {
      const id = `${s.key}:${a.id}`
      alerts.push({
        ...a, id, type: a.id, scopeKey: s.key, scopeLabel: s.label,
        isSavedLocation: s.isSavedLocation, read: read.has(id),
      })
    }
  }
  alerts.sort(
    (a, b) =>
      Number(a.read) - Number(b.read) ||
      (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
  )
  return { alerts, generatedAt: new Date().toISOString(), scopes: scopes.length }
}

/* -------------------------------- public ------------------------------- */

export async function getAlerts() {
  return USE_MOCKS ? getAlertsMock() : getAlertsReal()
}

export async function markRead(id) {
  if (!USE_MOCKS) {
    await request(`/alerts/${id}/read`, { method: 'PUT', body: JSON.stringify({ read: true }) })
    return
  }
  const set = readSet(); set.add(id); writeSet(set)
}

export async function markAllRead(ids) {
  if (!USE_MOCKS) {
    await request('/alerts/read-all', { method: 'PUT' })
    return
  }
  const set = readSet(); for (const id of ids) set.add(id); writeSet(set)
}

export async function markAllUnread(ids) {
  if (!USE_MOCKS) {
    await Promise.all(ids.map((id) =>
      request(`/alerts/${id}/read`, { method: 'PUT', body: JSON.stringify({ read: false }) })))
    return
  }
  const set = readSet(); for (const id of ids) set.delete(id); writeSet(set)
}
