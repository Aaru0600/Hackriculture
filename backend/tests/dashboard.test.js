import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb, mlStub } from './helpers/setup.js'
import { createApp } from '../src/app.js'

let request
let token
const auth = (r) => r.set('Authorization', `Bearer ${token}`)

before(async () => {
  await startTestEnv()
  request = supertest(createApp())
})
after(stopTestEnv)

beforeEach(async () => {
  await resetDb()
  mlStub.status = 200
  const reg = await request.post('/api/auth/register').send({
    name: 'Dash User', email: 'dash@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

test('GET /api/dashboard needs auth', async () => {
  assert.equal((await request.get('/api/dashboard')).status, 401)
})

test('returns a well-formed aggregate even with no activity', async () => {
  const res = await auth(request.get('/api/dashboard'))
  assert.equal(res.status, 200)
  const d = res.body.data
  assert.ok(d.farmSummary)
  for (const k of ['expectedYield', 'soilHealth', 'waterRequirement', 'cropHealth']) {
    assert.ok(k in d.kpis, `kpis.${k}`)
  }
  assert.equal(typeof d.farmHealth.score, 'number')
  assert.ok(Array.isArray(d.farmHealth.breakdown))
  assert.equal(d.kpis.expectedYield.value, null)   // nothing predicted yet
  assert.equal(d.isEstimated, true)
})

test('reflects the user\'s farm and latest prediction', async () => {
  await auth(request.post('/api/farms')).send({
    farmName: 'Home Plot', area: 2, currentCrop: 'wheat', growthStage: 'vegetative',
  })
  await auth(request.post('/api/predictions/yield')).send({
    crop: 'wheat', state: 'punjab', season: 'rabi', farmSize: 2,
  })

  const res = await auth(request.get('/api/dashboard'))
  const d = res.body.data
  assert.equal(d.farmSummary.farmName, 'Home Plot')
  assert.equal(d.farmSummary.currentCrop, 'wheat')
  assert.equal(d.totals.farms, 1)
  assert.ok(d.kpis.expectedYield.value > 0)
  assert.ok(d.basis.includes('yieldPrediction'))
  assert.ok(d.latestPrediction)
})
