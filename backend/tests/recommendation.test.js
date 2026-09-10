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
    name: 'Reco', email: 'reco@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

const auth = (r) => r.set('Authorization', `Bearer ${token}`)

const CROP_BODY = {
  nitrogen: 90, phosphorus: 42, potassium: 43,
  temperature: 21, humidity: 82, soilPH: 6.5, rainfall: 200,
}
const IRR_BODY = {
  crop: 'wheat', soilType: 'loamy', growthStage: 'vegetative',
  soilMoisture: 18, temperature: 33, humidity: 45, rainfall: 200,
  forecastRainProbability: 20, farmSize: 3, irrigationType: 'sprinkler',
}

test('crop recommendation needs auth', async () => {
  const res = await request.post('/api/recommendations/crop').send(CROP_BODY)
  assert.equal(res.status, 401)
})

test('crop recommendation returns ranked crops and stores it', async () => {
  const res = await auth(request.post('/api/recommendations/crop')).send(CROP_BODY)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.recommendations[0].crop, 'rice')
  assert.ok(res.body.data.recommendations[0].suitabilityScore > 50)
  assert.ok(Array.isArray(res.body.data.alternatives))
  assert.ok(res.body.data.disclaimer)

  const hist = await auth(request.get('/api/recommendations/history?kind=crop'))
  assert.equal(hist.body.data.total, 1)
  assert.equal(hist.body.data.items[0].kind, 'crop')
})

test('crop recommendation maps soilPH -> ph for the ML call', async () => {
  let seen
  const orig = mlStub.routes['/recommend/crops']
  mlStub.routes['/recommend/crops'] = (b) => { seen = b; return orig(b) }
  await auth(request.post('/api/recommendations/crop')).send(CROP_BODY)
  assert.equal(seen.ph, 6.5)
  assert.equal('soilPH' in seen, false)
  assert.equal(seen.top_n, 3)
  mlStub.routes['/recommend/crops'] = orig
})

test('crop recommendation validates inputs', async () => {
  const res = await auth(request.post('/api/recommendations/crop'))
    .send({ ...CROP_BODY, soilPH: 99 })
  assert.equal(res.status, 400)
})

test('irrigation recommendation returns need + water depth + schedule', async () => {
  const res = await auth(request.post('/api/recommendations/irrigation')).send(IRR_BODY)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.irrigationNeed, 'Medium')
  assert.equal(res.body.data.priority, 'Medium')
  assert.ok(res.body.data.waterRequirement.grossDepthMm > 0)
  assert.ok(res.body.data.nextIrrigation)
  assert.ok(res.body.data.reason)

  const hist = await auth(request.get('/api/recommendations/history'))
  assert.equal(hist.body.data.total, 1)
  assert.equal(hist.body.data.items[0].kind, 'irrigation')
})

test('irrigation recommendation rejects an unknown crop', async () => {
  const res = await auth(request.post('/api/recommendations/irrigation'))
    .send({ ...IRR_BODY, crop: 'dragonfruit' })
  assert.equal(res.status, 400)
})

test('an ML failure surfaces as 502', async () => {
  mlStub.status = 500
  const res = await auth(request.post('/api/recommendations/crop')).send(CROP_BODY)
  assert.equal(res.status, 502)
})

const FERT_BODY = {
  crop: 'wheat', nitrogen: 40, phosphorus: 20, potassium: 15,
  soilPH: 5.2, growthStage: 'sowing',
}

test('fertiliser recommendation is rule-based, needs no ML, and stores it', async () => {
  const res = await auth(request.post('/api/recommendations/fertilizer')).send(FERT_BODY)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.modelSource ?? res.body.data.model_source, 'rule_based')
  assert.ok(res.body.data.items.length > 0)                 // deficits present
  assert.ok(res.body.data.items[0].quantityKgPerHa > 0)
  assert.match(res.body.data.soilAmendment || '', /acidic/) // pH 5.2 -> lime note
  assert.ok(res.body.data.disclaimer)

  const hist = await auth(request.get('/api/recommendations/history?kind=fertilizer'))
  assert.equal(hist.body.data.total, 1)
  assert.equal(hist.body.data.items[0].kind, 'fertilizer')
})

test('fertiliser recommendation validates the crop and nutrients', async () => {
  assert.equal(
    (await auth(request.post('/api/recommendations/fertilizer')).send({ ...FERT_BODY, crop: 'kiwi' })).status,
    400,
  )
  assert.equal(
    (await auth(request.post('/api/recommendations/fertilizer')).send({ ...FERT_BODY, nitrogen: -5 })).status,
    400,
  )
})
