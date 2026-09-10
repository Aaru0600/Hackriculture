/**
 * Authentication service.
 *
 * Mock mode (VITE_USE_MOCKS=true): a self-contained account store in
 * localStorage, so the whole auth flow - register, login, session, profile,
 * forgot-password - works with no backend. Passwords are lightly obfuscated,
 * NOT secure; real hashing (bcrypt) and JWT live in the Node backend.
 *
 * Real mode: the same functions hit the spec's endpoints
 * (POST /auth/register, POST /auth/login, GET /auth/me, ...).
 */
import { USE_MOCKS, request, mockResponse, ApiError } from './apiClient'

const USERS_KEY = 'hk_users'
const TOKEN_KEY = 'hk_token'
const USER_KEY = 'hk_user'

/* ----------------------------- mock helpers ----------------------------- */

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}
const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users))
const obfuscate = (str) => btoa(unescape(encodeURIComponent(str)))

function seedIfEmpty() {
  if (readUsers().length > 0) return
  writeUsers([
    {
      id: 'admin-seed',
      name: 'Platform Admin',
      email: 'admin@hackriculture.test',
      phone: '',
      passwordHash: obfuscate('admin1234'),
      role: 'admin',
      state: 'Delhi',
      district: 'New Delhi',
      preferredLanguage: 'en',
      farmSize: null,
      farmSizeUnit: 'acre',
      createdAt: new Date().toISOString(),
    },
  ])
}

// Strip the credential before the user object leaves this module.
const publicUser = ({ passwordHash: _pw, ...rest }) => rest
const makeToken = (id) => `mock.${obfuscate(`${id}:${Date.now()}`)}`

function persistSession(user) {
  const token = makeToken(user.id)
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(publicUser(user)))
  return { user: publicUser(user), token }
}

/* ------------------------------- API ---------------------------------- */

export async function register(payload) {
  if (!USE_MOCKS) {
    const body = await request('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    })
    persistTokens(body.data)
    return body.data
  }

  seedIfEmpty()
  const users = readUsers()
  const exists = users.some(
    (u) =>
      (payload.email && u.email?.toLowerCase() === payload.email.toLowerCase()) ||
      (payload.phone && u.phone === payload.phone),
  )
  if (exists) throw new ApiError('An account with these details already exists', 409)

  const user = {
    id: `u_${Date.now().toString(36)}`,
    name: payload.name.trim(),
    email: payload.email?.trim().toLowerCase() || '',
    phone: payload.phone?.trim() || '',
    passwordHash: obfuscate(payload.password),
    role: 'farmer',
    state: payload.state || '',
    district: payload.district?.trim() || '',
    preferredLanguage: payload.preferredLanguage || 'en',
    farmSize: payload.farmSize ? Number(payload.farmSize) : null,
    farmSizeUnit: payload.farmSizeUnit || 'acre',
    createdAt: new Date().toISOString(),
  }
  writeUsers([...users, user])
  return mockResponse(persistSession(user), { message: 'Account created' }).then((r) => r.data)
}

export async function login({ identifier, password }) {
  if (!USE_MOCKS) {
    const body = await request('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ identifier, password }),
    })
    persistTokens(body.data)
    return body.data
  }

  seedIfEmpty()
  const id = identifier.trim().toLowerCase()
  const user = readUsers().find(
    (u) => u.email?.toLowerCase() === id || u.phone === identifier.trim(),
  )
  if (!user || user.passwordHash !== obfuscate(password)) {
    throw new ApiError('Incorrect login details. Check and try again.', 401)
  }
  return mockResponse(persistSession(user), { message: 'Signed in' }).then((r) => r.data)
}

export async function logout() {
  if (!USE_MOCKS) {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch {
      /* ignore - clear locally regardless */
    }
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function getCurrentUser() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  if (!USE_MOCKS) {
    try {
      const body = await request('/auth/me')
      return body.data
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
  }

  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export async function updateProfile(patch) {
  if (!USE_MOCKS) {
    const body = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    localStorage.setItem(USER_KEY, JSON.stringify(body.data))
    return body.data
  }

  const current = await getCurrentUser()
  if (!current) throw new ApiError('Not signed in', 401)
  const users = readUsers().map((u) =>
    u.id === current.id ? { ...u, ...patch } : u,
  )
  writeUsers(users)
  const updated = { ...current, ...patch }
  localStorage.setItem(USER_KEY, JSON.stringify(updated))
  return mockResponse(updated, { message: 'Profile updated' }).then((r) => r.data)
}

export async function forgotPassword(identifier) {
  if (!USE_MOCKS) {
    await request('/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ identifier }),
    })
    return { sent: true }
  }
  // Never reveal whether an account exists.
  return mockResponse({ sent: true }, { message: 'If the account exists, a reset link was sent' }).then(
    (r) => r.data,
  )
}

export async function changePassword({ currentPassword, newPassword }) {
  if (!USE_MOCKS) {
    await request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    return { changed: true }
  }

  const current = await getCurrentUser()
  if (!current) throw new ApiError('Not signed in', 401)
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === current.id)
  if (idx === -1 || users[idx].passwordHash !== obfuscate(currentPassword)) {
    throw new ApiError('Current password is incorrect', 401)
  }
  users[idx] = { ...users[idx], passwordHash: obfuscate(newPassword) }
  writeUsers(users)
  return mockResponse({ changed: true }, { message: 'Password updated' }).then((r) => r.data)
}

function persistTokens(data) {
  if (data?.token) localStorage.setItem(TOKEN_KEY, data.token)
  if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

/** For demos: the seeded admin login. */
export const DEMO_ADMIN = { identifier: 'admin@hackriculture.test', password: 'admin1234' }
