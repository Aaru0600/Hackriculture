import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb } from './helpers/setup.js'
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
  const reg = await request.post('/api/auth/register').send({
    name: 'Alerts User', email: 'al@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

test('GET /api/alerts needs auth', async () => {
  assert.equal((await request.get('/api/alerts')).status, 401)
})

test('no saved location and no farms -> empty feed', async () => {
  const res = await auth(request.get('/api/alerts'))
  assert.equal(res.status, 200)
  assert.equal(res.body.data.total, 0)
  assert.deepEqual(res.body.data.items, [])
})

test('with a saved location, alerts are generated from the forecast and can be marked read', async () => {
  await auth(request.put('/api/auth/profile')).send({
    location: { name: 'Ludhiana', latitude: 30.9, longitude: 75.85 },
  })

  const first = await auth(request.get('/api/alerts'))
  assert.equal(first.status, 200)
  assert.ok(first.body.data.items.length > 0)
  assert.ok(first.body.data.unread > 0)
  const alert = first.body.data.items[0]
  assert.ok(alert.i18nKey.startsWith('farmAlerts.'))
  assert.ok(alert.title)

  // regenerating keeps the same id (dedup by key) and the read flag
  const markRead = await auth(request.put(`/api/alerts/${alert.id}/read`)).send({})
  assert.equal(markRead.status, 200)
  assert.equal(markRead.body.data.read, true)

  const again = await auth(request.get('/api/alerts'))
  const same = again.body.data.items.find((a) => a.id === alert.id)
  assert.equal(same.read, true)

  const unreadOnly = await auth(request.get('/api/alerts?unread=true'))
  assert.equal(unreadOnly.body.data.items.some((a) => a.id === alert.id), false)
})

test('PUT /api/alerts/read-all clears the unread count', async () => {
  await auth(request.put('/api/auth/profile')).send({
    location: { name: 'Ludhiana', latitude: 30.9, longitude: 75.85 },
  })
  await auth(request.get('/api/alerts'))

  const all = await auth(request.put('/api/alerts/read-all'))
  assert.equal(all.status, 200)

  const after = await auth(request.get('/api/alerts'))
  assert.equal(after.body.data.unread, 0)
})

test('marking a non-existent alert read is 404', async () => {
  const res = await auth(request.put('/api/alerts/64b7f0000000000000000000/read')).send({})
  assert.equal(res.status, 404)
})
