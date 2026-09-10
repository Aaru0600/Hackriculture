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
    name: 'Chatty', email: 'chat@example.com', password: 'greenfield9', state: 'punjab',
  })
  token = reg.body.data.token
})

const auth = (r) => r.set('Authorization', `Bearer ${token}`)

test('assistant chat needs auth', async () => {
  const res = await request.post('/api/assistant/chat')
    .send({ messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(res.status, 401)
})

test('assistant replies (rule-based fallback, no API key in test)', async () => {
  const res = await auth(request.post('/api/assistant/chat'))
    .send({ messages: [{ role: 'user', content: 'how much urea for wheat?' }] })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.source, 'rules')
  assert.match(res.body.data.reply, /fertilizer|urea/i)
})

test('assistant validates the messages array', async () => {
  const res = await auth(request.post('/api/assistant/chat')).send({ messages: [] })
  assert.equal(res.status, 400)
})
