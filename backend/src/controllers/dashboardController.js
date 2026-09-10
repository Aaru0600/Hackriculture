import { asyncHandler } from '../utils/asyncHandler.js'
import { ok } from '../utils/ApiResponse.js'
import { Farm } from '../models/Farm.js'
import { Prediction } from '../models/Prediction.js'
import { Recommendation } from '../models/Recommendation.js'
import { Alert } from '../models/Alert.js'

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const RISK_HEALTH = { low: 88, moderate: 70, high: 52 }

/**
 * GET /api/dashboard - aggregate for the farmer home screen.
 *
 * KPI + health values are DERIVED from the user's own recent predictions and
 * recommendations (not sensor data). Where a signal has not been generated yet
 * it falls back to a neutral 70 and is left out of `basis`. The frontend shows a
 * "based on your recent activity" note.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const user = req.user
  const userId = user.id

  const [farms, latestYield, latestCrop, latestFert, latestIrr, activeAlerts, recentPreds, recentRecs] =
    await Promise.all([
      Farm.find({ user: userId }).sort({ createdAt: -1 }),
      Prediction.findOne({ user: userId, type: 'yield' }).sort({ createdAt: -1 }),
      Recommendation.findOne({ user: userId, kind: 'crop' }).sort({ createdAt: -1 }),
      Recommendation.findOne({ user: userId, kind: 'fertilizer' }).sort({ createdAt: -1 }),
      Recommendation.findOne({ user: userId, kind: 'irrigation' }).sort({ createdAt: -1 }),
      Alert.countDocuments({ user: userId, read: false }),
      Prediction.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
      Recommendation.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
    ])

  const primaryFarm = farms[0] ?? null
  const basis = []

  // ---- farm summary ----
  const farmSummary = {
    farmName: primaryFarm?.farmName
      ?? (user.name ? `${user.name.split(' ')[0]}'s Farm` : 'My Farm'),
    farmSize: primaryFarm?.area ?? user.farmSize ?? null,
    farmSizeUnit: primaryFarm?.areaUnit ?? user.farmSizeUnit ?? 'acre',
    currentCrop: primaryFarm?.currentCrop || latestYield?.input?.crop || null,
    soilType: primaryFarm?.soilType || latestYield?.input?.soilType || null,
    location: primaryFarm?.location
      || [user.district, user.state].filter(Boolean).join(', ')
      || null,
    growthStage: primaryFarm?.growthStage || null,
    sownOn: primaryFarm?.sownOn ?? null,
  }

  // ---- KPI values (derived) ----
  let expectedYield = null
  if (latestYield?.predictedYield != null) {
    expectedYield = Math.round(latestYield.predictedYield * 100) / 100
    basis.push('yieldPrediction')
  }

  let waterRequirement = null
  const irrOut = latestIrr?.output
  if (irrOut?.waterRequirement?.grossDepthMm != null) {
    waterRequirement = Math.round(irrOut.waterRequirement.grossDepthMm)
    basis.push('irrigationPlan')
  }

  let soilHealth = 70
  const fertItems = latestFert?.output?.items
  if (Array.isArray(fertItems)) {
    soilHealth = clamp(100 - fertItems.length * 14)
    basis.push('fertiliserPlan')
  }

  let cropHealth = 70
  if (latestYield?.riskLevel) {
    cropHealth = RISK_HEALTH[latestYield.riskLevel] ?? 70
    basis.push('yieldRisk')
  }

  // ---- farm health score ----
  const weatherRisk = clamp(100 - Math.min(activeAlerts, 5) * 12)
  const parts = [soilHealth, cropHealth, weatherRisk]
  const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)

  const breakdown = [
    { key: 'soil', value: soilHealth },
    { key: 'crop', value: cropHealth },
    { key: 'weatherRisk', value: weatherRisk },
  ]
  if (waterRequirement != null) {
    breakdown.splice(2, 0, { key: 'water', value: clamp(100 - Math.abs(waterRequirement - 45)) })
  }

  // ---- recent activity ----
  const recentActivity = [
    ...recentPreds.map((p) => ({ kind: 'prediction', type: p.type, at: p.createdAt })),
    ...recentRecs.map((r) => ({ kind: 'recommendation', type: r.kind, at: r.createdAt })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)

  return ok(res, {
    farmSummary,
    kpis: {
      expectedYield: { value: expectedYield, unit: 't/ha', delta: null, series: [] },
      soilHealth: { value: soilHealth, unit: '%', delta: null, series: [] },
      waterRequirement: { value: waterRequirement, unit: 'mm', delta: null, series: [] },
      cropHealth: { value: cropHealth, unit: '%', delta: null, series: [] },
    },
    farmHealth: { score, breakdown },
    totals: {
      farms: farms.length,
      predictions: recentPreds.length ? await Prediction.countDocuments({ user: userId }) : 0,
      recommendations: recentRecs.length ? await Recommendation.countDocuments({ user: userId }) : 0,
      activeAlerts,
    },
    latestPrediction: latestYield
      ? { id: latestYield.id, crop: latestYield.input?.crop, predictedYield: latestYield.predictedYield, createdAt: latestYield.createdAt }
      : null,
    latestRecommendations: {
      crop: latestCrop?.summary ?? null,
      fertilizer: latestFert?.summary ?? null,
      irrigation: latestIrr?.summary ?? null,
    },
    recentActivity,
    basis,
    isEstimated: basis.length < 3,
  })
})
