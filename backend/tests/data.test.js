import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv } from './helpers/setup.js'
import { createApp } from '../src/app.js'

// The provider URLs point at a dead port (tests/setup-env.js), so every call
// here exercises the labelled fallback path rather than the live providers.

let request
before(async () => {
  await startTestEnv()
  request = supertest(createApp())
})
after(stopTestEnv)

test('GET /api/weather/bundle returns a 7-day labelled fallback when the provider is down', async () => {
  const res = await request.get('/api/weather/bundle?lat=30.9&lon=75.8')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.isMock, true)
  assert.match(res.body.data.provider, /sample/i)
  assert.equal(res.body.data.daily.length, 7)
  assert.ok(res.body.data.current.temperature != null)
})

test('GET /api/weather/bundle validates lat/lon', async () => {
  assert.equal((await request.get('/api/weather/bundle')).status, 400)
  assert.equal((await request.get('/api/weather/bundle?lat=999&lon=0')).status, 400)
})

test('GET /api/weather/annual-rainfall returns a number (labelled sample when the archive is down)', async () => {
  const res = await request.get('/api/weather/annual-rainfall?lat=30.9&lon=75.85')
  assert.equal(res.status, 200)
  assert.equal(typeof res.body.data.annualRainfallMm, 'number')
  assert.ok(res.body.data.annualRainfallMm > 0)
  assert.equal(res.body.data.isMock, true)          // archive URL points at a dead port in tests
  assert.equal((await request.get('/api/weather/annual-rainfall?lat=200&lon=0')).status, 400)
})

test('GET /api/geo/search needs a query of >= 2 chars and returns an array', async () => {
  assert.equal((await request.get('/api/geo/search?q=a')).status, 400)
  const res = await request.get('/api/geo/search?q=ludhiana')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
})

test('GET /api/geo/reverse falls back to coordinates', async () => {
  const res = await request.get('/api/geo/reverse?lat=30.9&lon=75.8')
  assert.equal(res.status, 200)
  assert.ok(typeof res.body.data.name === 'string')
})

test('GET /api/soil/estimate returns a labelled sample when SoilGrids is unavailable', async () => {
  const res = await request.get('/api/soil/estimate?lat=30.9&lon=75.8')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.isMock, true)
  assert.ok(res.body.data.soilPH > 0)
  assert.ok(res.body.data.soilTypeKey)
})
