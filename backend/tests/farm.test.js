import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb } from './helpers/setup.js'
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
  const reg = await request.post('/api/auth/register').send({
    name: 'Farmer One', email: 'one@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

const auth = (r) => r.set('Authorization', `Bearer ${token}`)

const FARM_BODY = {
  farmName: 'North Field',
  area: 3.5,
  areaUnit: 'acre',
  location: 'Ludhiana, Punjab',
  soilType: 'Loamy',
  irrigationType: 'Canal',
  currentCrop: 'wheat',
  cropSeason: 'rabi',
  sownOn: '2026-11-05',
  growthStage: 'vegetative',
}

async function registerOther() {
  const reg = await request.post('/api/auth/register').send({
    name: 'Farmer Two', email: 'two@example.com', password: 'greenfield9', state: 'haryana',
  })
  return reg.body.data.token
}

test('farms endpoints need auth', async () => {
  assert.equal((await request.get('/api/farms')).status, 401)
  assert.equal((await request.post('/api/farms').send(FARM_BODY)).status, 401)
})

test('create -> returns the farm, normalises enum casing, and lists it', async () => {
  const res = await auth(request.post('/api/farms')).send(FARM_BODY)
  assert.equal(res.status, 201)
  assert.ok(res.body.data.id)
  assert.equal(res.body.data.farmName, 'North Field')
  assert.equal(res.body.data.soilType, 'loamy')
  assert.equal(res.body.data.irrigationType, 'canal')

  const list = await auth(request.get('/api/farms'))
  assert.equal(list.status, 200)
  assert.equal(list.body.data.total, 1)
  assert.equal(list.body.data.items[0].id, res.body.data.id)
})

test('area unit defaults to acre when omitted', async () => {
  const { areaUnit: _omit, ...noUnit } = FARM_BODY
  const res = await auth(request.post('/api/farms')).send(noUnit)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.areaUnit, 'acre')
})

test('create rejects a missing farmName and an out-of-range area', async () => {
  const noName = await auth(request.post('/api/farms')).send({ area: 2 })
  assert.equal(noName.status, 400)
  const badArea = await auth(request.post('/api/farms')).send({ farmName: 'X', area: -1 })
  assert.equal(badArea.status, 400)
})

test('get / update / delete are scoped to the owner', async () => {
  const created = await auth(request.post('/api/farms')).send(FARM_BODY)
  const id = created.body.data.id
  const otherToken = await registerOther()
  const asOther = (r) => r.set('Authorization', `Bearer ${otherToken}`)

  assert.equal((await asOther(request.get(`/api/farms/${id}`))).status, 404)
  assert.equal((await asOther(request.put(`/api/farms/${id}`)).send({ farmName: 'Hijack' })).status, 404)
  assert.equal((await asOther(request.delete(`/api/farms/${id}`))).status, 404)
  assert.equal((await asOther(request.get('/api/farms'))).body.data.total, 0)
})

test('update applies a partial change without disturbing other fields', async () => {
  const created = await auth(request.post('/api/farms')).send(FARM_BODY)
  const id = created.body.data.id

  const upd = await auth(request.put(`/api/farms/${id}`)).send({ growthStage: 'flowering' })
  assert.equal(upd.status, 200)
  assert.equal(upd.body.data.growthStage, 'flowering')
  assert.equal(upd.body.data.farmName, 'North Field')
  assert.equal(upd.body.data.areaUnit, 'acre')
})

test('update with an empty body is rejected', async () => {
  const created = await auth(request.post('/api/farms')).send(FARM_BODY)
  const res = await auth(request.put(`/api/farms/${created.body.data.id}`)).send({})
  assert.equal(res.status, 400)
})

test('delete removes the farm', async () => {
  const created = await auth(request.post('/api/farms')).send(FARM_BODY)
  const id = created.body.data.id

  const del = await auth(request.delete(`/api/farms/${id}`))
  assert.equal(del.status, 200)
  assert.equal(del.body.data.id, id)
  assert.equal((await auth(request.get(`/api/farms/${id}`))).status, 404)
})

test('a missing but well-formed id returns 404, a malformed id 400', async () => {
  assert.equal((await auth(request.get('/api/farms/64b7f0000000000000000000'))).status, 404)
  assert.equal((await auth(request.get('/api/farms/not-an-id'))).status, 400)
})
