/**
 * Farmer history - past yield predictions and recommendations. Thin aggregator
 * over predictionService + recommendationService (both hit the Node backend in
 * real mode; both return empty lists in mock mode).
 */
import { getPredictionHistory } from './predictionService'
import { getRecommendationHistory } from './recommendationService'

export async function getYieldHistory(params = {}) {
  return getPredictionHistory({ type: 'yield', limit: 50, ...params })
}

export async function getRecommendationsHistory(params = {}) {
  return getRecommendationHistory({ limit: 50, ...params })
}
