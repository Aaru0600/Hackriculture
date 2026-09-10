/**
 * Admin panel data. Real mode -> /api/admin/* (Bearer + admin role).
 * Mock mode -> synthetic figures, partly derived from the local mock stores
 * (`hk_users`, `hk_farms`) so the seeded demo admin can browse the panel with
 * no backend. Everything here is clearly labelled as sample data in the UI.
 */
import { USE_MOCKS, request, mockResponse } from './apiClient'

const qs = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]),
  ).toString()

const readLS = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    return v ?? fallback
  } catch {
    return fallback
  }
}

/* -------------------------------- stats -------------------------------- */

export async function getStats() {
  if (!USE_MOCKS) return (await request('/admin/stats')).data
  const users = readLS('hk_users', [])
  const farms = readLS('hk_farms', [])
  return mockResponse({
    totalFarmers: users.filter((u) => u.role !== 'admin').length,
    totalAdmins: users.filter((u) => u.role === 'admin').length,
    activeUsers: users.length,
    newUsers7d: users.length,
    totalFarms: farms.length,
    predictionsMade: 0,
    recommendationsGenerated: 0,
    recommendationsByKind: {},
    alerts: 0,
    isMock: true,
  }).then((r) => r.data)
}

/* -------------------------------- users -------------------------------- */

export async function listUsers(params = {}) {
  if (!USE_MOCKS) return (await request(`/admin/users?${qs({ page: 1, limit: 20, ...params })}`)).data
  const all = readLS('hk_users', []).map((u) => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
    state: u.state, district: u.district, createdAt: u.createdAt,
  }))
  const q = (params.q || '').toLowerCase()
  const items = q
    ? all.filter((u) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q))
    : all
  return mockResponse({ items, page: 1, limit: 20, total: items.length, pages: 1, isMock: true }).then((r) => r.data)
}

export async function updateUserRole(id, role) {
  if (!USE_MOCKS) return (await request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })).data
  const users = readLS('hk_users', []).map((u) => (u.id === id ? { ...u, role } : u))
  localStorage.setItem('hk_users', JSON.stringify(users))
  return mockResponse(users.find((u) => u.id === id)).then((r) => r.data)
}

export async function deleteUser(id) {
  if (!USE_MOCKS) return (await request(`/admin/users/${id}`, { method: 'DELETE' })).data
  localStorage.setItem('hk_users', JSON.stringify(readLS('hk_users', []).filter((u) => u.id !== id)))
  return mockResponse({ id }).then((r) => r.data)
}

/* ------------------------- activity (read-only) ----------------------- */

export async function listPredictions(params = {}) {
  if (!USE_MOCKS) return (await request(`/admin/predictions?${qs({ page: 1, limit: 20, ...params })}`)).data
  return mockResponse({ items: [], page: 1, limit: 20, total: 0, pages: 0, isMock: true }).then((r) => r.data)
}

export async function listRecommendations(params = {}) {
  if (!USE_MOCKS) return (await request(`/admin/recommendations?${qs({ page: 1, limit: 20, ...params })}`)).data
  return mockResponse({ items: [], page: 1, limit: 20, total: 0, pages: 0, isMock: true }).then((r) => r.data)
}

/* -------------------------------- models ------------------------------- */

const MOCK_MODELS = [
  { key: 'yield', name: 'Crop Yield (HGB regressor)', version: '2.0-real', algorithm: 'HistGradientBoostingRegressor', metrics: { r2: 0.96, mae_t_ha: 1.2 }, trainedAt: '2026-09-10', status: 'production', notes: '', liveInfoAvailable: false },
  { key: 'crop', name: 'Crop Recommendation (RF)', version: 'crop-1.0', algorithm: 'RandomForestClassifier', metrics: { accuracy: 0.99, macro_f1: 0.99 }, trainedAt: '2026-09-10', status: 'production', notes: '', liveInfoAvailable: false },
  { key: 'irrigation', name: 'Irrigation Need (RF)', version: 'irrigation-1.0', algorithm: 'RandomForestClassifier', metrics: { macro_f1: 0.97 }, trainedAt: '2026-09-10', status: 'production', notes: '', liveInfoAvailable: false },
]

export async function listModels() {
  if (!USE_MOCKS) return (await request('/admin/models')).data
  return mockResponse({ items: MOCK_MODELS, mlServiceReachable: false, isMock: true }).then((r) => r.data)
}

export async function updateModel(key, patch) {
  if (!USE_MOCKS) return (await request(`/admin/models/${key}`, { method: 'PATCH', body: JSON.stringify(patch) })).data
  return mockResponse({ key, ...patch }).then((r) => r.data)
}

/* ------------------------------- datasets ----------------------------- */

const DS_KEY = 'hk_admin_datasets'
const SEED_DATASETS = [
  { id: 'ds-1', name: 'Crop Yield in Indian States (Kaggle)', task: 'yield', rows: 5150, source: 'Kaggle', synthetic: false, status: 'active', description: 'State-year yield aggregates 1997-2020.', createdAt: '2026-09-10T00:00:00Z' },
  { id: 'ds-2', name: 'Crop Recommendation Dataset (Kaggle)', task: 'crop', rows: 2200, source: 'Kaggle', synthetic: false, status: 'active', description: 'Balanced N-P-K + climate -> 22 crops.', createdAt: '2026-09-10T00:00:00Z' },
  { id: 'ds-3', name: 'Irrigation Prediction Dataset', task: 'irrigation', rows: 10000, source: 'Public', synthetic: false, status: 'active', description: 'Field + weather features -> Low/Medium/High need.', createdAt: '2026-09-10T00:00:00Z' },
]

export async function listDatasets() {
  if (!USE_MOCKS) return (await request('/admin/datasets')).data
  const items = readLS(DS_KEY, null) ?? (localStorage.setItem(DS_KEY, JSON.stringify(SEED_DATASETS)), SEED_DATASETS)
  return mockResponse({ items, total: items.length, isMock: true }).then((r) => r.data)
}

export async function createDataset(body) {
  if (!USE_MOCKS) return (await request('/admin/datasets', { method: 'POST', body: JSON.stringify(body) })).data
  const items = readLS(DS_KEY, SEED_DATASETS)
  const row = { id: `ds-${Date.now().toString(36)}`, status: 'active', ...body, createdAt: new Date().toISOString() }
  localStorage.setItem(DS_KEY, JSON.stringify([row, ...items]))
  return mockResponse(row).then((r) => r.data)
}

export async function updateDataset(id, patch) {
  if (!USE_MOCKS) return (await request(`/admin/datasets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })).data
  const items = readLS(DS_KEY, SEED_DATASETS).map((d) => (d.id === id ? { ...d, ...patch } : d))
  localStorage.setItem(DS_KEY, JSON.stringify(items))
  return mockResponse(items.find((d) => d.id === id)).then((r) => r.data)
}

export async function deleteDataset(id) {
  if (!USE_MOCKS) return (await request(`/admin/datasets/${id}`, { method: 'DELETE' })).data
  localStorage.setItem(DS_KEY, JSON.stringify(readLS(DS_KEY, SEED_DATASETS).filter((d) => d.id !== id)))
  return mockResponse({ id }).then((r) => r.data)
}
