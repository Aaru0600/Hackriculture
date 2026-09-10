/**
 * Crop & irrigation recommendation.
 *
 * Real mode: POST /recommendations/{crop,irrigation} on the Node backend, which
 * calls the Python ML service (crop = RandomForest classifier; irrigation =
 * classifier + rule layer).
 * Mock mode: a clearly-synthetic local heuristic with the same response shape.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'
import {
  mockCropRecommendation, mockIrrigationRecommendation,
} from '@/mock/recommendations'

/**
 * @param {{ nitrogen:number, phosphorus:number, potassium:number,
 *   temperature:number, humidity:number, soilPH:number, rainfall:number,
 *   soilType?:string, season?:string, topN?:number }} input
 */
export async function recommendCrop(input) {
  if (!USE_MOCKS) {
    const body = await request('/recommendations/crop', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.data
  }
  return mockResponse(mockCropRecommendation(input), { message: 'Crop recommendation ready' })
    .then((r) => r.data)
}

/**
 * @param {{ crop:string, soilType?:string, growthStage?:string,
 *   soilMoisture?:number, temperature?:number, humidity?:number, rainfall?:number,
 *   forecastRainProbability?:number, farmSize?:number, irrigationType?:string }} input
 */
export async function recommendIrrigation(input) {
  if (!USE_MOCKS) {
    const body = await request('/recommendations/irrigation', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.data
  }
  return mockResponse(mockIrrigationRecommendation(input), { message: 'Irrigation recommendation ready' })
    .then((r) => r.data)
}

/** @param {{ kind?: 'crop'|'fertilizer'|'irrigation', page?: number, limit?: number }} [params] */
export async function getRecommendationHistory(params = {}) {
  if (!USE_MOCKS) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
    ).toString()
    const body = await request(`/recommendations/history${qs ? `?${qs}` : ''}`)
    return body.data
  }
  return mockResponse({ items: [], page: 1, limit: 20, total: 0, pages: 0 }).then((r) => r.data)
}
