/**
 * Offline farm store for mock mode. Persists to localStorage (`hk_farms`) so
 * add / edit / delete actually stick during a demo - same approach as the mock
 * auth store. Shapes match the Node backend's `/api/farms` responses.
 */
const KEY = 'hk_farms'

const SAMPLE = [
  {
    id: 'farm-sample-1',
    farmName: 'North Field',
    area: 3.5,
    areaUnit: 'acre',
    location: 'Ludhiana, Punjab',
    latitude: 30.901,
    longitude: 75.857,
    soilType: 'loamy',
    irrigationType: 'canal',
    currentCrop: 'wheat',
    cropSeason: 'rabi',
    sownOn: '2025-11-08T00:00:00.000Z',
    growthStage: 'vegetative',
    expectedHarvest: '2026-04-05T00:00:00.000Z',
    createdAt: '2025-11-08T06:30:00.000Z',
    updatedAt: '2026-01-20T06:30:00.000Z',
    isMock: true,
  },
]

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) {
      localStorage.setItem(KEY, JSON.stringify(SAMPLE))
      return [...SAMPLE]
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [...SAMPLE]
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage disabled - keep going, changes just won't persist */
  }
}

const uid = () =>
  `farm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function mockListFarms() {
  const items = read().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  return { items, total: items.length }
}

export function mockGetFarm(id) {
  return read().find((f) => f.id === id) ?? null
}

export function mockCreateFarm(body) {
  const now = new Date().toISOString()
  const farm = {
    id: uid(),
    areaUnit: 'acre',
    location: '',
    latitude: null,
    longitude: null,
    soilType: null,
    irrigationType: null,
    currentCrop: '',
    cropSeason: null,
    sownOn: null,
    growthStage: null,
    expectedHarvest: null,
    ...body,
    createdAt: now,
    updatedAt: now,
    isMock: true,
  }
  write([farm, ...read()])
  return farm
}

export function mockUpdateFarm(id, patch) {
  const list = read()
  const idx = list.findIndex((f) => f.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  write(list)
  return list[idx]
}

export function mockDeleteFarm(id) {
  const list = read()
  const next = list.filter((f) => f.id !== id)
  if (next.length === list.length) return null
  write(next)
  return { id }
}
