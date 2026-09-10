/**
 * Farm management - the signed-in user's fields.
 *
 * Real mode: /api/farms CRUD on the Node backend (Bearer auth, owner-scoped).
 * Mock mode: a localStorage-backed store (`src/mock/farms.js`) so add / edit /
 * delete persist during a demo. Same response shapes either way.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'
import {
  mockListFarms, mockGetFarm, mockCreateFarm, mockUpdateFarm, mockDeleteFarm,
} from '@/mock/farms'

export async function listFarms() {
  if (!USE_MOCKS) {
    const body = await request('/farms')
    return body.data
  }
  return mockResponse(mockListFarms(), { message: 'Farms loaded' }).then((r) => r.data)
}

export async function getFarm(id) {
  if (!USE_MOCKS) {
    const body = await request(`/farms/${id}`)
    return body.data
  }
  return mockResponse(mockGetFarm(id)).then((r) => r.data)
}

export async function createFarm(input) {
  if (!USE_MOCKS) {
    const body = await request('/farms', { method: 'POST', body: JSON.stringify(input) })
    return body.data
  }
  return mockResponse(mockCreateFarm(input), { message: 'Farm created' }).then((r) => r.data)
}

export async function updateFarm(id, patch) {
  if (!USE_MOCKS) {
    const body = await request(`/farms/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    return body.data
  }
  return mockResponse(mockUpdateFarm(id, patch), { message: 'Farm updated' }).then((r) => r.data)
}

export async function deleteFarm(id) {
  if (!USE_MOCKS) {
    const body = await request(`/farms/${id}`, { method: 'DELETE' })
    return body.data
  }
  return mockResponse(mockDeleteFarm(id), { message: 'Farm deleted' }).then((r) => r.data)
}
