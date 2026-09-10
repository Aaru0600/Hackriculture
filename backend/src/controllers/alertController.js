import { asyncHandler } from '../utils/asyncHandler.js'
import { ok } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Alert } from '../models/Alert.js'
import { Farm } from '../models/Farm.js'
import { weatherBundle } from '../services/dataProviders.js'
import {
  deriveWeatherAlerts, deriveFarmContextAlerts, renderAlert,
} from '../services/alertEngine.js'

const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 }
const coordKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`

/**
 * GET /api/alerts?unread=true&farm=<id>
 * Regenerates alerts from the current forecast for the user's saved location
 * and every farm with coordinates, then returns them (read flags preserved).
 */
export const listAlerts = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const scopes = []

  const loc = req.user.location
  if (loc?.latitude != null && loc?.longitude != null) {
    scopes.push({
      scopeId: 'loc', farm: null, isSavedLocation: true,
      label: loc.name || '', lat: loc.latitude, lon: loc.longitude,
    })
  }

  const farms = await Farm.find({ user: userId })
  for (const f of farms) {
    if (f.latitude == null || f.longitude == null) continue
    scopes.push({
      scopeId: `farm:${f.id}`, farm: f, isSavedLocation: false,
      label: f.farmName, lat: f.latitude, lon: f.longitude,
    })
  }

  if (scopes.length > 0) {
    // one forecast fetch per unique coordinate
    const bundles = new Map()
    await Promise.all(
      [...new Map(scopes.map((s) => [coordKey(s.lat, s.lon), s])).values()].map(async (s) => {
        bundles.set(coordKey(s.lat, s.lon), await weatherBundle(s.lat, s.lon))
      }),
    )

    const now = new Date()
    const seenKeys = []
    const ops = []

    for (const s of scopes) {
      const bundle = bundles.get(coordKey(s.lat, s.lon))
      const derived = [
        ...deriveWeatherAlerts(bundle),
        ...(s.farm ? deriveFarmContextAlerts(s.farm) : []),
      ]
      for (const d of derived) {
        const key = `${s.scopeId}:${d.type}`
        seenKeys.push(key)
        const { title, body } = renderAlert(d.type, d.values)
        ops.push({
          updateOne: {
            filter: { user: userId, key },
            update: {
              $set: {
                farm: s.farm?.id ?? null,
                type: d.type,
                severity: d.severity,
                i18nKey: `farmAlerts.${d.type}`,
                values: d.values,
                title,
                body,
                scopeLabel: s.label,
                isSavedLocation: s.isSavedLocation,
                lastSeenAt: now,
              },
              $setOnInsert: { read: false },
            },
            upsert: true,
          },
        })
      }
    }

    if (ops.length) await Alert.bulkWrite(ops)
    // drop alerts for conditions that no longer hold
    await Alert.deleteMany({ user: userId, key: { $nin: seenKeys } })
  }

  const filter = { user: userId }
  if (req.query.unread === 'true') filter.read = false
  if (req.query.farm) filter.farm = req.query.farm

  const list = (await Alert.find(filter)).map((d) => d.toJSON())
  list.sort(
    (a, b) =>
      Number(a.read) - Number(b.read) ||
      (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
  )

  return ok(res, {
    items: list,
    total: list.length,
    unread: list.filter((a) => !a.read).length,
    generatedAt: new Date().toISOString(),
  })
})

/** PUT /api/alerts/:id/read   body: { read?: boolean } (defaults true) */
export const markAlertRead = asyncHandler(async (req, res) => {
  const read = req.body?.read !== false
  const doc = await Alert.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: { read } },
    { new: true },
  )
  if (!doc) throw ApiError.notFound('Alert not found')
  return ok(res, doc.toJSON(), read ? 'Marked read' : 'Marked unread')
})

/** PUT /api/alerts/read-all */
export const markAllAlertsRead = asyncHandler(async (req, res) => {
  const r = await Alert.updateMany({ user: req.user.id, read: false }, { $set: { read: true } })
  return ok(res, { modified: r.modifiedCount ?? 0 }, 'All alerts marked read')
})
