import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Prediction } from '../models/Prediction.js'
import * as ml from '../services/mlService.js'

/** camelCase client input -> snake_case ML payload; drops undefined keys. */
function toMlPayload(input) {
  const map = {
    crop: input.crop,
    state: input.state,
    season: input.season,
    farm_size_ha: input.farmSize,
    crop_year: input.cropYear,
    annual_rainfall_mm: input.rainfall,
    fertilizer_per_ha: input.fertilizerPerHa,
    pesticide_per_ha: input.pesticidePerHa,
    soil_type: input.soilType,
    growth_stage: input.growthStage,
    nitrogen: input.nitrogen,
    phosphorus: input.phosphorus,
    potassium: input.potassium,
    ph: input.soilPH,
    temperature: input.temperature,
    humidity: input.humidity,
    sow_month: input.sowMonth,
    previous_yield: input.previousYield,
  }
  return Object.fromEntries(Object.entries(map).filter(([, v]) => v !== undefined))
}

const qualityLabel = (score) =>
  score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'

/** Shape the ML response for the frontend (camelCase, spec-compatible). */
function toClient(mlOut, doc) {
  return {
    id: doc.id,
    createdAt: doc.createdAt,

    predictedYield: mlOut.predicted_yield_t_ha,
    unit: 'tons/hectare',
    yieldRange: mlOut.yield_range_t_ha,
    expectedProduction: mlOut.expected_production_t,

    predictionQuality: mlOut.prediction_quality,          // 0-100 model score
    predictionQualityLabel: qualityLabel(mlOut.prediction_quality),
    predictionQualityNote: mlOut.prediction_quality_note,
    riskLevel: mlOut.risk_level,

    coreYield: mlOut.core_yield_t_ha,
    adjustmentFactor: mlOut.adjustment_factor,
    adjustmentInputsUsed: mlOut.adjustment_inputs_used,
    adjustmentDetail: mlOut.adjustment_detail,

    referenceYield: mlOut.reference_yield_t_ha,
    importantFactors: mlOut.influencing_factors,          // spec's key name
    responseCurves: mlOut.response_curves,

    modelVersion: mlOut.model_version ?? 'unknown',
    modelSource: mlOut.model_source,
    disclaimer:
      'Estimate only. Yields vary with local soil, weather and management. ' +
      'Verify with a local agricultural expert and a current soil test before acting.',
  }
}

/** POST /api/predictions/yield */
export const createYieldPrediction = asyncHandler(async (req, res) => {
  const input = req.body
  const mlOut = await ml.predictYield(toMlPayload(input))

  const doc = await Prediction.create({
    user: req.user.id,
    type: 'yield',
    input,
    output: mlOut,
    predictedYield: mlOut.predicted_yield_t_ha,
    unit: 'tons/hectare',
    predictionQuality: mlOut.prediction_quality,
    predictionQualityLabel: qualityLabel(mlOut.prediction_quality),
    riskLevel: mlOut.risk_level,
    modelVersion: mlOut.model_version,
    modelSource: mlOut.model_source,
  })

  return created(res, toClient(mlOut, doc), 'Yield prediction ready')
})

/** GET /api/predictions/history */
export const listHistory = asyncHandler(async (req, res) => {
  const { type, page, limit } = req.query
  const filter = { user: req.user.id, ...(type ? { type } : {}) }

  const [items, total] = await Promise.all([
    Prediction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Prediction.countDocuments(filter),
  ])

  return ok(res, {
    items: items.map((d) => d.toJSON()),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  })
})

/** GET /api/predictions/:id */
export const getPrediction = asyncHandler(async (req, res) => {
  const doc = await Prediction.findOne({ _id: req.params.id, user: req.user.id })
  if (!doc) throw ApiError.notFound('Prediction not found')
  return ok(res, doc.toJSON())
})
