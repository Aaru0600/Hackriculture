import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb, mlStub } from './helpers/setup.js'
import { createApp } from '../src/app.js'
import { User } from '../src/models/User.js'

let request
let adminToken
let farmerToken

const asAdmin = (r) => r.set('Authorization', `Bearer ${adminToken}`)
const asFarmer = (r) => r.set('Authorization', `Bearer ${farmerToken}`)

before(async () => {
  await startTestEnv()
  request = supertest(createApp())
})
after(stopTestEnv)

beforeEach(async () => {
  await resetDb()
  mlStub.status = 200

  const a = await request.post('/api/auth/register').send({
    name: 'Admin', email: 'admin@example.com', password: 'greenfield9', state: 'delhi',
  })
  adminToken = a.body.data.token
  await User.findByIdAndUpdate(a.body.data.user.id, { role: 'admin' })

  const f = await request.post('/api/auth/register').send({
    name: 'Farmer', email: 'farmer@example.com', password: 'greenfield9', state: 'punjab',
  })
  farmerToken = f.body.data.token
})

test('admin routes reject non-admins', async () => {
  assert.equal((await request.get('/api/admin/stats')).status, 401)
  assert.equal((await asFarmer(request.get('/api/admin/stats'))).status, 403)
})

test('GET /api/admin/stats returns platform counts', async () => {
  const res = await asAdmin(request.get('/api/admin/stats'))
  assert.equal(res.status, 200)
  assert.equal(res.body.data.totalFarmers, 1)
  assert.equal(res.body.data.totalAdmins, 1)
  assert.ok('predictionsMade' in res.body.data)
})

test('GET /api/admin/users lists and searches; role change is guarded', async () => {
  const list = await asAdmin(request.get('/api/admin/users'))
  assert.equal(list.status, 200)
  assert.equal(list.body.data.total, 2)

  const search = await asAdmin(request.get('/api/admin/users?q=farmer'))
  assert.equal(search.body.data.items.length, 1)
  const farmerId = search.body.data.items[0].id

  const promote = await asAdmin(request.patch(`/api/admin/users/${farmerId}`)).send({ role: 'admin' })
  assert.equal(promote.status, 200)
  assert.equal(promote.body.data.role, 'admin')

  // cannot change your own role
  const me = await asAdmin(request.get('/api/auth/me'))
  const self = await asAdmin(request.patch(`/api/admin/users/${me.body.data.id}`)).send({ role: 'farmer' })
  assert.equal(self.status, 400)
})

test('DELETE /api/admin/users/:id removes the user and their records', async () => {
  const list = await asAdmin(request.get('/api/admin/users?q=farmer'))
  const farmerId = list.body.data.items[0].id
  await asFarmer(request.post('/api/farms')).send({ farmName: 'X', area: 1 })

  const del = await asAdmin(request.delete(`/api/admin/users/${farmerId}`))
  assert.equal(del.status, 200)
  assert.equal((await asAdmin(request.get('/api/admin/users'))).body.data.total, 1)
})

test('GET /api/admin/models merges live /model-info with admin notes', async () => {
  const res = await asAdmin(request.get('/api/admin/models'))
  assert.equal(res.status, 200)
  assert.equal(res.body.data.mlServiceReachable, true)
  assert.equal(res.body.data.items.length, 3)
  const yieldModel = res.body.data.items.find((m) => m.key === 'yield')
  assert.ok(yieldModel.version)                       // dataset sha (short)
  assert.ok(/HistGradientBoosting/.test(yieldModel.algorithm))
  assert.ok(yieldModel.metrics.r2 > 0.9)
  assert.equal(yieldModel.liveInfoAvailable, true)
  assert.equal(yieldModel.status, 'production')
  const cropModel = res.body.data.items.find((m) => m.key === 'crop')
  assert.ok(cropModel.metrics.accuracy > 0.9)

  const upd = await asAdmin(request.patch('/api/admin/models/yield')).send({ status: 'retraining', notes: 'nightly job' })
  assert.equal(upd.status, 200)
  assert.equal(upd.body.data.status, 'retraining')

  const after = await asAdmin(request.get('/api/admin/models'))
  assert.equal(after.body.data.items.find((m) => m.key === 'yield').status, 'retraining')
})

test('dataset registry CRUD', async () => {
  const create = await asAdmin(request.post('/api/admin/datasets')).send({
    name: 'Crop Yield in Indian States', task: 'yield', rows: 5150, synthetic: false,
  })
  assert.equal(create.status, 201)
  const id = create.body.data.id

  const list = await asAdmin(request.get('/api/admin/datasets'))
  assert.equal(list.body.data.total, 1)

  const upd = await asAdmin(request.patch(`/api/admin/datasets/${id}`)).send({ status: 'archived' })
  assert.equal(upd.body.data.status, 'archived')

  const del = await asAdmin(request.delete(`/api/admin/datasets/${id}`))
  assert.equal(del.status, 200)
  assert.equal((await asAdmin(request.get('/api/admin/datasets'))).body.data.total, 0)
})
