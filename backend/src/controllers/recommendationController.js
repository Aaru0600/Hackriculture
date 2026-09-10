import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Recommendation } from '../models/Recommendation.js'
import * as ml from '../services/mlService.js'
import { recommendFertilizer } from '../services/fertilizerEngine.js'

/** POST /api/recommendations/crop */
export const createCropRecommendation = asyncHandler(async (req, res) => {
  const { topN, soilPH, ...rest } = req.body
  const mlOut = await ml.recommendCrops({
    ...rest,
    ph: soilPH,            // spec's soilPH -> model's ph
    top_n: topN,
  })

  const top = mlOut.recommendations?.[0]?.crop
  const doc = await Recommendation.create({
    user: req.user.id,
    kind: 'crop',
    input: req.body,
    output: mlOut,
    summary: top ? `Top crop: ${top}` : 'Crop recommendation',
    modelVersion: mlOut.model_version,
    modelSource: mlOut.model_source,
  })

  return created(res, {
    id: doc.id,
    createdAt: doc.createdAt,
    recommendations: mlOut.recommendations,
    alternatives: mlOut.alternatives,
    modelVersion: mlOut.model_version,
    modelSource: mlOut.model_source,
    disclaimer: mlOut.disclaimer,
  }, 'Crop recommendation ready')
})

/** POST /api/recommendations/irrigation */
export const createIrrigationRecommendation = asyncHandler(async (req, res) => {
  const mlOut = await ml.recommendIrrigation(req.body)

  const doc = await Recommendation.create({
    user: req.user.id,
    kind: 'irrigation',
    input: req.body,
    output: mlOut,
    summary: `Irrigation need: ${mlOut.irrigationNeed} (${mlOut.waterRequirement?.grossDepthMm} mm)`,
    modelVersion: mlOut.model_version,
    modelSource: mlOut.model_source,
  })

  return created(res, {
    id: doc.id,
    createdAt: doc.createdAt,
    irrigationNeed: mlOut.irrigationNeed,
    needConfidence: mlOut.needConfidence,
    priority: mlOut.priority,
    waterRequirement: mlOut.waterRequirement,
    nextIrrigation: mlOut.nextIrrigation,
    duration: mlOut.duration,
    rainfallAdjustment: mlOut.rainfallAdjustment,
    reason: mlOut.reason,
    assumptions: mlOut.assumptions,
    modelVersion: mlOut.model_version,
    modelSource: mlOut.model_source,
    disclaimer: mlOut.disclaimer,
  }, 'Irrigation recommendation ready')
})

/** POST /api/recommendations/fertilizer  (rule-based engine, no ML service) */
export const createFertilizerRecommendation = asyncHandler(async (req, res) => {
  const out = recommendFertilizer(req.body)

  const doc = await Recommendation.create({
    user: req.user.id,
    kind: 'fertilizer',
    input: req.body,
    output: out,
    summary: out.deficiencies.length
      ? `Fertiliser: ${out.deficiencies.join(', ')} deficit`
      : 'Fertiliser: N-P-K adequate',
    modelVersion: out.model_version,
    modelSource: out.model_source,
  })

  return created(res, { id: doc.id, createdAt: doc.createdAt, ...out }, 'Fertiliser plan ready')
})

/** GET /api/recommendations/history?kind=&page=&limit= */
export const listRecommendationHistory = asyncHandler(async (req, res) => {
  const { kind, page, limit } = req.query
  const filter = { user: req.user.id, ...(kind ? { kind } : {}) }
  const [items, total] = await Promise.all([
    Recommendation.find(filter).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit),
    Recommendation.countDocuments(filter),
  ])
  return ok(res, {
    items: items.map((d) => d.toJSON()),
    page, limit, total, pages: Math.ceil(total / limit),
  })
})

/** GET /api/recommendations/:id */
export const getRecommendation = asyncHandler(async (req, res) => {
  const doc = await Recommendation.findOne({ _id: req.params.id, user: req.user.id })
  if (!doc) throw ApiError.notFound('Recommendation not found')
  return ok(res, doc.toJSON())
})
