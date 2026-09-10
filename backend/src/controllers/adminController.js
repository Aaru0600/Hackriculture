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
import { getModelInfo } from '../services/mlService.js'

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

/** GET /api/admin/models - live /model-info merged with admin ModelRecord notes. */
export const listModels = asyncHandler(async (_req, res) => {
  const records = await ModelRecord.find()
  const recByKey = Object.fromEntries(records.map((r) => [r.key, r.toJSON()]))

  let info = null
  try {
    info = await getModelInfo()
  } catch {
    info = null
  }
  const models = (info?.models ?? info ?? {})

  const keys = ['yield', 'crop', 'irrigation']
  const items = keys.map((key) => {
    const m = models[key] ?? models[`${key}_model`] ?? {}
    return {
      key,
      name: m.name ?? m.model_name ?? `${key} model`,
      version: m.version ?? m.model_version ?? null,
      algorithm: m.algorithm ?? m.model_source ?? null,
      metrics: m.metrics ?? m.holdout ?? null,
      trainedAt: m.trained_at ?? m.last_updated ?? null,
      liveInfoAvailable: info != null && Object.keys(m).length > 0,
      status: recByKey[key]?.status ?? 'production',
      notes: recByKey[key]?.notes ?? '',
      recordUpdatedAt: recByKey[key]?.updatedAt ?? null,
    }
  })
  return ok(res, { items, mlServiceReachable: info != null })
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
