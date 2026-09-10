import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb, mlStub } from './helpers/setup.js'
import { createApp } from '../src/app.js'

let request
let token

before(async () => {
  await startTestEnv()
  request = supertest(createApp())
})
after(stopTestEnv)

beforeEach(async () => {
  await resetDb()
  mlStub.status = 200
  const reg = await request.post('/api/auth/register').send({
    name: 'Bhola', email: 'bhola@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

const auth = (r) => r.set('Authorization', `Bearer ${token}`)

const YIELD_BODY = {
  crop: 'wheat', state: 'Punjab', season: 'rabi', farmSize: 3,
  nitrogen: 120, phosphorus: 60, potassium: 40, soilPH: 6.8,
  temperature: 18, humidity: 60, rainfall: 650, soilType: 'loamy',
  growthStage: 'flowering', previousYield: 3.4,
}

test('POST /predictions/yield needs auth', async () => {
  const res = await request.post('/api/predictions/yield').send(YIELD_BODY)
  assert.equal(res.status, 401)
})

test('POST /predictions/yield validates the crop', async () => {
  const res = await auth(request.post('/api/predictions/yield'))
    .send({ ...YIELD_BODY, crop: 'dragonfruit' })
  assert.equal(res.status, 400)
  assert.equal(res.body.success, false)
})

test('POST /predictions/yield returns the ML result and stores it', async () => {
  const res = await auth(request.post('/api/predictions/yield')).send(YIELD_BODY)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.predictedYield, 3.42)
  assert.equal(res.body.data.unit, 'tons/hectare')
  assert.equal(res.body.data.predictionQualityLabel, 'high') // 78 -> high
  assert.equal(res.body.data.riskLevel, 'low')
  assert.ok(res.body.data.id)
  assert.ok(res.body.data.disclaimer.length > 0)
  assert.ok(Array.isArray(res.body.data.importantFactors))

  const hist = await auth(request.get('/api/predictions/history'))
  assert.equal(hist.status, 200)
  assert.equal(hist.body.data.total, 1)
  assert.equal(hist.body.data.items[0].type, 'yield')
  assert.equal(hist.body.data.items[0].predictedYield, 3.42)
})

test('lower-cases crop/state/season before calling ML', async () => {
  let seen
  const original = mlStub.handler
  mlStub.handler = (body) => { seen = body; return original(body) }

  await auth(request.post('/api/predictions/yield')).send(YIELD_BODY)
  assert.equal(seen.state, 'punjab')
  assert.equal(seen.crop, 'wheat')
  assert.equal(seen.ph, 6.8)              // soilPH -> ph
  assert.equal(seen.farm_size_ha, 3)     // farmSize -> farm_size_ha
  assert.equal(seen.annual_rainfall_mm, 650)
  assert.equal('soilPH' in seen, false)

  mlStub.handler = original
})

test('surfaces an ML service failure as 502', async () => {
  mlStub.status = 500
  const res = await auth(request.post('/api/predictions/yield')).send(YIELD_BODY)
  assert.equal(res.status, 502)
  assert.equal(res.body.success, false)
})

test('history is per-user and paginated', async () => {
  await auth(request.post('/api/predictions/yield')).send(YIELD_BODY)
  await auth(request.post('/api/predictions/yield')).send(YIELD_BODY)

  const other = await request.post('/api/auth/register').send({
    name: 'Other', email: 'other@example.com', password: 'password12', state: 'bihar',
  })
  const otherHist = await request.get('/api/predictions/history')
    .set('Authorization', `Bearer ${other.body.data.token}`)
  assert.equal(otherHist.body.data.total, 0)

  const page1 = await auth(request.get('/api/predictions/history?limit=1&page=1'))
  assert.equal(page1.body.data.total, 2)
  assert.equal(page1.body.data.items.length, 1)
  assert.equal(page1.body.data.pages, 2)
})
