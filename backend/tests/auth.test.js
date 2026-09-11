import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import supertest from 'supertest'
import { startTestEnv, stopTestEnv, resetDb } from './helpers/setup.js'
import { createApp } from '../src/app.js'

let request

before(async () => {
  await startTestEnv()
  request = supertest(createApp())
})
after(stopTestEnv)
beforeEach(resetDb)

const NEW_USER = {
  name: 'Asha Farmer',
  email: 'asha@example.com',
  password: 'sunflower22',
  state: 'punjab',
}

test('register creates a farmer and returns a token', async () => {
  const res = await request.post('/api/auth/register').send(NEW_USER)
  assert.equal(res.status, 201)
  assert.equal(res.body.success, true)
  assert.equal(res.body.data.user.role, 'farmer')
  assert.equal(res.body.data.user.email, 'asha@example.com')
  assert.ok(res.body.data.token)
  assert.equal(res.body.data.user.passwordHash, undefined)
})

test('register with an email sends a verification link (dev mode returns devLink)', async () => {
  const res = await request.post('/api/auth/register').send(NEW_USER)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.user.isEmailVerified, false)
  assert.equal(res.body.data.emailVerification.required, true)
  assert.ok(res.body.data.emailVerification.devLink.includes('/verify-email?token='))
})

test('register by phone only needs no email verification', async () => {
  const res = await request.post('/api/auth/register').send({
    name: 'Phone Only', password: 'sunflower22', phone: '9990002222',
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.data.user.isEmailVerified, true)
  assert.equal(res.body.data.emailVerification.required, false)
})

test('verify-email marks the account verified and rejects a bad/expired token', async () => {
  const reg = await request.post('/api/auth/register').send(NEW_USER)
  const link = reg.body.data.emailVerification.devLink
  const token = new URL(link).searchParams.get('token')

  const bad = await request.post('/api/auth/verify-email').send({ token: 'x'.repeat(40) })
  assert.equal(bad.status, 400)

  const good = await request.post('/api/auth/verify-email').send({ token })
  assert.equal(good.status, 200)
  assert.equal(good.body.data.user.isEmailVerified, true)
  assert.ok(good.body.data.token)

  const reused = await request.post('/api/auth/verify-email').send({ token })
  assert.equal(reused.status, 400)
})

test('resend-verification issues a fresh link and never reveals unknown accounts', async () => {
  await request.post('/api/auth/register').send(NEW_USER)

  const known = await request.post('/api/auth/resend-verification').send({ email: NEW_USER.email })
  assert.equal(known.status, 200)
  assert.ok(known.body.data.devLink.includes('/verify-email?token='))

  const unknown = await request.post('/api/auth/resend-verification').send({ email: 'nobody@example.com' })
  assert.equal(unknown.status, 200)
  assert.equal(unknown.body.data.sent, true)
  assert.equal(unknown.body.data.devLink, undefined)
})

test('register rejects a weak password', async () => {
  const res = await request.post('/api/auth/register').send({ ...NEW_USER, password: 'short' })
  assert.equal(res.status, 400)
  assert.equal(res.body.success, false)
})

test('register tolerates blank/null optional fields from the form', async () => {
  // shape the RegisterPage actually sends when fields are left untouched
  const res = await request.post('/api/auth/register').send({
    name: 'Blank Fields', email: 'blank@example.com', password: 'greenfield9',
    phone: '', state: 'Punjab', district: '', preferredLanguage: 'en',
    farmSize: null, farmSizeUnit: 'acre',
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.data.user.farmSize, null)
})

test('register rejects a duplicate email', async () => {
  await request.post('/api/auth/register').send(NEW_USER)
  const res = await request.post('/api/auth/register').send(NEW_USER)
  assert.equal(res.status, 409)
})

test('login works with email or phone and rejects a bad password', async () => {
  await request.post('/api/auth/register').send({ ...NEW_USER, phone: '9990001111' })

  const byEmail = await request.post('/api/auth/login')
    .send({ identifier: NEW_USER.email, password: NEW_USER.password })
  assert.equal(byEmail.status, 200)
  assert.ok(byEmail.body.data.token)

  const byPhone = await request.post('/api/auth/login')
    .send({ identifier: '9990001111', password: NEW_USER.password })
  assert.equal(byPhone.status, 200)

  const bad = await request.post('/api/auth/login')
    .send({ identifier: NEW_USER.email, password: 'wrongpass' })
  assert.equal(bad.status, 401)
})

test('GET /auth/me needs a token and returns the current user', async () => {
  const reg = await request.post('/api/auth/register').send(NEW_USER)
  const token = reg.body.data.token

  const noAuth = await request.get('/api/auth/me')
  assert.equal(noAuth.status, 401)

  const ok = await request.get('/api/auth/me').set('Authorization', `Bearer ${token}`)
  assert.equal(ok.status, 200)
  assert.equal(ok.body.data.email, NEW_USER.email)
})

test('PUT /auth/profile updates allowed fields only', async () => {
  const reg = await request.post('/api/auth/register').send(NEW_USER)
  const token = reg.body.data.token

  const res = await request.put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ district: 'Ludhiana', role: 'admin' }) // role must be ignored

  assert.equal(res.status, 200)
  assert.equal(res.body.data.district, 'Ludhiana')
  assert.equal(res.body.data.role, 'farmer')
})

test('PUT /auth/password changes the password and rejects a wrong current one', async () => {
  const reg = await request.post('/api/auth/register').send(NEW_USER)
  const token = reg.body.data.token
  const authd = (r) => r.set('Authorization', `Bearer ${token}`)

  const wrong = await authd(request.put('/api/auth/password'))
    .send({ currentPassword: 'nope', newPassword: 'brandnew99' })
  assert.equal(wrong.status, 401)

  const okRes = await authd(request.put('/api/auth/password'))
    .send({ currentPassword: NEW_USER.password, newPassword: 'brandnew99' })
  assert.equal(okRes.status, 200)

  const relogin = await request.post('/api/auth/login')
    .send({ identifier: NEW_USER.email, password: 'brandnew99' })
  assert.equal(relogin.status, 200)
})
