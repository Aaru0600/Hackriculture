/**
 * Farmer dashboard aggregate. Mock mode builds the payload locally (seeded from
 * the signed-in user); real mode calls GET /dashboard on the Node backend,
 * which composes farms + latest predictions + weather + alerts.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'
import { mockDashboard } from '@/mock/dashboard'

export async function getDashboard(user) {
  if (!USE_MOCKS) {
    const body = await request('/dashboard')
    return body.data
  }
  return mockResponse(mockDashboard(user), { message: 'Dashboard loaded' }).then((r) => r.data)
}
