import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Farm } from '../models/Farm.js'

/** GET /api/farms - the signed-in user's farms, newest first. */
export const listFarms = asyncHandler(async (req, res) => {
  const items = await Farm.find({ user: req.user.id }).sort({ createdAt: -1 })
  return ok(res, { items: items.map((d) => d.toJSON()), total: items.length })
})

/** GET /api/farms/:id */
export const getFarm = asyncHandler(async (req, res) => {
  const doc = await Farm.findOne({ _id: req.params.id, user: req.user.id })
  if (!doc) throw ApiError.notFound('Farm not found')
  return ok(res, doc.toJSON())
})

/** POST /api/farms */
export const createFarm = asyncHandler(async (req, res) => {
  const doc = await Farm.create({ ...req.body, user: req.user.id })
  return created(res, doc.toJSON(), 'Farm created')
})

/** PUT /api/farms/:id - partial update, scoped to the owner. */
export const updateFarm = asyncHandler(async (req, res) => {
  const doc = await Farm.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: req.body },
    { new: true, runValidators: true },
  )
  if (!doc) throw ApiError.notFound('Farm not found')
  return ok(res, doc.toJSON(), 'Farm updated')
})

/** DELETE /api/farms/:id */
export const deleteFarm = asyncHandler(async (req, res) => {
  const doc = await Farm.findOneAndDelete({ _id: req.params.id, user: req.user.id })
  if (!doc) throw ApiError.notFound('Farm not found')
  return ok(res, { id: req.params.id }, 'Farm deleted')
})
