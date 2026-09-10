/**
 * Fertilizer recommendation.
 *
 * There is no ML model for this yet - the spec asks for a rule/hybrid approach.
 * Mock mode (the default) uses a local rule-based calculator. The real branch
 * targets the future `POST /api/recommendations/fertilizer` endpoint so it drops
 * in unchanged once the backend adds it.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'
import { mockFertilizerRecommendation } from '@/mock/fertilizer'

/**
 * @param {{ crop:string, soilType?:string, growthStage?:string,
 *   nitrogen:number, phosphorus:number, potassium:number, soilPH:number }} input
 */
export async function recommendFertilizer(input) {
  if (!USE_MOCKS) {
    const body = await request('/recommendations/fertilizer', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return body.data
  }
  return mockResponse(mockFertilizerRecommendation(input), { message: 'Fertilizer plan ready' })
    .then((r) => r.data)
}
