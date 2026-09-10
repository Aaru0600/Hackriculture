/**
 * Crop-yield prediction.
 *
 * Real mode: POST /predictions/yield -> Node validates -> Python ML service
 * (real-data model + agronomic adjustment) -> stored -> returned.
 * Mock mode: a clearly-synthetic local heuristic with the same response shape.
 *
 * Prediction logic never lives in the frontend (spec rule) - the mock is only
 * a placeholder so the UI works offline.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'
import { mockYieldPrediction, mockYieldHistory } from '@/mock/predictions'

/**
 * @param {{
 *   crop: string, state: string, season: string, farmSize: number,
 *   cropYear?: number, rainfall?: number, fertilizerPerHa?: number, pesticidePerHa?: number,
 *   soilType?: string, growthStage?: string,
 *   nitrogen?: number, phosphorus?: number, potassium?: number, soilPH?: number,
 *   temperature?: number, humidity?: number, sowMonth?: number, previousYield?: number
 * }} input
 */
export async function predictYield(input) {
  if (!USE_MOCKS) {
    const body = await request('/predictions/yield', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.data
  }
  return mockResponse(mockYieldPrediction(input), { message: 'Yield prediction ready' })
    .then((r) => r.data)
}

/** @param {{ type?: string, page?: number, limit?: number }} [params] */
export async function getPredictionHistory(params = {}) {
  if (!USE_MOCKS) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
    ).toString()
    const body = await request(`/predictions/history${qs ? `?${qs}` : ''}`)
    return body.data
  }
  return mockResponse(mockYieldHistory(), { message: 'History loaded' }).then((r) => r.data)
}

export async function getPrediction(id) {
  if (!USE_MOCKS) {
    const body = await request(`/predictions/${id}`)
    return body.data
  }
  return mockResponse(null, { message: 'Not available in mock mode' }).then((r) => r.data)
}
