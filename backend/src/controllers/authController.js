import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { signToken } from '../middleware/auth.js'

const session = (user) => ({ user: user.toJSON(), token: signToken(user) })

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { password, ...fields } = req.body

  const or = []
  if (fields.email) or.push({ email: fields.email })
  if (fields.phone) or.push({ phone: fields.phone })
  if (or.length && (await User.exists({ $or: or }))) {
    throw ApiError.conflict('An account with these details already exists')
  }

  const user = new User({ ...fields, role: 'farmer' })
  await user.setPassword(password)
  await user.save()

  return created(res, session(user), 'Account created')
})

/** POST /api/auth/login  — identifier is email or phone */
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body
  const id = identifier.trim()

  const user = await User.findOne({
    $or: [{ email: id.toLowerCase() }, { phone: id }],
  }).select('+passwordHash')

  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Incorrect login details. Check and try again.')
  }

  return ok(res, session(user), 'Signed in')
})

/** POST /api/auth/logout  — JWT is stateless; client discards the token. */
export const logout = asyncHandler(async (_req, res) => ok(res, { loggedOut: true }, 'Signed out'))

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => ok(res, req.user.toJSON()))

/** PUT /api/auth/profile */
export const updateProfile = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body)
  await req.user.save()
  return ok(res, req.user.toJSON(), 'Profile updated')
})

/** POST /api/auth/forgot-password  — never reveal whether the account exists. */
export const forgotPassword = asyncHandler(async (_req, res) =>
  ok(res, { sent: true }, 'If the account exists, a reset link was sent'),
)

/** PUT /api/auth/password  — change password for the signed-in user. */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect')
  }
  await user.setPassword(newPassword)
  await user.save()
  return ok(res, { changed: true }, 'Password updated')
})
