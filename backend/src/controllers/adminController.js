import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { Farm } from '../models/Farm.js'
import { Prediction } from '../models/Prediction.js'
import { Recommendation } from '../models/Recommendation.js'
import { Alert } from '../models/Alert.js'
import { Dataset } from '../models/Dataset.js'
import { ModelRecord } from '../models/ModelRecord.js'
import { getAllModelCards } from '../services/mlService.js'

const paginate = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) })

/** GET /api/admin/stats */
export const getStats = asyncHandler(async (_req, res) => {
  const [farmers, admins, farms, predictions, recommendations, alerts, recent] = await Promise.all([
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'admin' }),
    Farm.countDocuments(),
    Prediction.countDocuments(),
    Recommendation.countDocuments(),
    Alert.countDocuments(),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
  ])
  const byKind = await Recommendation.aggregate([{ $group: { _id: '$kind', n: { $sum: 1 } } }])
  return ok(res, {
    totalFarmers: farmers,
    totalAdmins: admins,
    activeUsers: farmers + admins,
    newUsers7d: recent,
    totalFarms: farms,
    predictionsMade: predictions,
    recommendationsGenerated: recommendations,
    recommendationsByKind: Object.fromEntries(byKind.map((r) => [r._id, r.n])),
    alerts,
  })
})

/** GET /api/admin/users?q&page&limit */
export const listUsers = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query
  const filter = q
    ? { $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }] }
    : {}
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ])
  return ok(res, { items: items.map((u) => u.toJSON()), ...paginate(page, limit, total) })
})

/** PATCH /api/admin/users/:id   body: { role } */
export const updateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot change your own role')
  const doc = await User.findByIdAndUpdate(req.params.id, { $set: { role: req.body.role } }, { new: true })
  if (!doc) throw ApiError.notFound('User not found')
  return ok(res, doc.toJSON(), 'User updated')
})

/** DELETE /api/admin/users/:id */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account here')
  const doc = await User.findByIdAndDelete(req.params.id)
  if (!doc) throw ApiError.notFound('User not found')
  await Promise.all([
    Farm.deleteMany({ user: doc._id }),
    Prediction.deleteMany({ user: doc._id }),
    Recommendation.deleteMany({ user: doc._id }),
    Alert.deleteMany({ user: doc._id }),
  ])
  return ok(res, { id: req.params.id }, 'User and their records deleted')
})

/** GET /api/admin/predictions?page&limit */
export const listPredictions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query
  const [items, total] = await Promise.all([
    Prediction.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email'),
    Prediction.countDocuments(),
  ])
  return ok(res, { items: items.map((d) => d.toJSON()), ...paginate(page, limit, total) })
})

/** GET /api/admin/recommendations?page&limit */
export const listRecommendations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query
  const [items, total] = await Promise.all([
    Recommendation.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email'),
    Recommendation.countDocuments(),
  ])
  return ok(res, { items: items.map((d) => d.toJSON()), ...paginate(page, limit, total) })
})

const NAMES = {
  yield: 'Crop Yield Prediction',
  crop: 'Crop Recommendation',
  irrigation: 'Smart Irrigation',
}

/** Pull a small flat metrics object out of a model card's nested `metrics`. */
function headlineMetrics(key, card) {
  const m = card?.metrics
  if (!m) return null
  if (key === 'yield' && m.gbm_holdout) {
    return { r2: m.gbm_holdout.r2, mae_t_ha: m.gbm_holdout.mae, mape_pct: m.gbm_holdout.mape_pct }
  }
  if (key === 'crop') {
    return { accuracy: m.accuracy, macro_f1: m.macro_f1, top3_accuracy: m.top3_accuracy }
  }
  if (key === 'irrigation') {
    return { macro_f1_holdout: m.macro_f1_holdout }
  }
  // fallback: keep only number-valued keys
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === 'number'))
}

/** GET /api/admin/models - live model cards (/model-info?task=) + admin ModelRecord notes. */
export const listModels = asyncHandler(async (_req, res) => {
  const records = await ModelRecord.find()
  const recByKey = Object.fromEntries(records.map((r) => [r.key, r.toJSON()]))

  const { cards, reachable } = await getAllModelCards()

  const items = ['yield', 'crop', 'irrigation'].map((key) => {
    const card = cards[key]
    return {
      key,
      name: NAMES[key],
      algorithm: card?.model_type ?? null,
      version: card?.dataset?.sha256 ? card.dataset.sha256.slice(0, 8) : null,
      datasetRows: card?.dataset?.rows ?? null,
      synthetic: card?.dataset?.synthetic ?? null,
      metrics: headlineMetrics(key, card),
      trainedAt: card?.created_at ?? null,
      liveInfoAvailable: card != null,
      status: recByKey[key]?.status ?? 'production',
      notes: recByKey[key]?.notes ?? '',
      recordUpdatedAt: recByKey[key]?.updatedAt ?? null,
    }
  })
  return ok(res, { items, mlServiceReachable: reachable })
})

/** PATCH /api/admin/models/:key   body: { status?, notes? } */
export const updateModel = asyncHandler(async (req, res) => {
  const key = req.params.key
  if (!['yield', 'crop', 'irrigation', 'fertilizer'].includes(key)) {
    throw ApiError.badRequest('Unknown model key')
  }
  const doc = await ModelRecord.findOneAndUpdate(
    { key },
    { $set: { ...req.body, updatedBy: req.user.id } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  return ok(res, doc.toJSON(), 'Model record updated')
})

/** Datasets registry CRUD */
export const listDatasets = asyncHandler(async (_req, res) => {
  const items = await Dataset.find().sort({ createdAt: -1 })
  return ok(res, { items: items.map((d) => d.toJSON()), total: items.length })
})

export const createDataset = asyncHandler(async (req, res) => {
  const doc = await Dataset.create({ ...req.body, addedBy: req.user.id })
  return created(res, doc.toJSON(), 'Dataset registered')
})

export const updateDataset = asyncHandler(async (req, res) => {
  const doc = await Dataset.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
  if (!doc) throw ApiError.notFound('Dataset not found')
  return ok(res, doc.toJSON(), 'Dataset updated')
})

export const deleteDataset = asyncHandler(async (req, res) => {
  const doc = await Dataset.findByIdAndDelete(req.params.id)
  if (!doc) throw ApiError.notFound('Dataset not found')
  return ok(res, { id: req.params.id }, 'Dataset removed from the registry')
})
