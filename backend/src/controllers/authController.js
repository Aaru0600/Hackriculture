import { asyncHandler } from '../utils/asyncHandler.js'
import { ok, created } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { signToken } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { hasMxRecord } from '../lib/emailDomain.js'
import { sendVerificationEmail } from '../services/emailService.js'

const session = (user) => ({ user: user.toJSON(), token: signToken(user) })

async function issueAndSendVerification(user) {
  const rawToken = user.issueEmailVerificationToken()
  await user.save()
  const link = `${env.APP_URL}/verify-email?token=${rawToken}`
  const result = await sendVerificationEmail({ to: user.email, name: user.name, link })
  return {
    required: true,
    sent: result.sent,
    // Only surfaced when no SMTP is configured (dev/demo) - never in prod.
    devLink: !env.isProd && result.devLink ? result.devLink : undefined,
  }
}

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { password, ...fields } = req.body

  const or = []
  if (fields.email) or.push({ email: fields.email })
  if (fields.phone) or.push({ phone: fields.phone })
  if (or.length && (await User.exists({ $or: or }))) {
    throw ApiError.conflict('An account with these details already exists')
  }

  if (fields.email && env.EMAIL_VERIFY_MX && !(await hasMxRecord(fields.email))) {
    throw ApiError.badRequest(
      "That email domain doesn't appear to accept mail - check for typos.",
      { field: 'email' },
    )
  }

  const user = new User({ ...fields, role: 'farmer' })
  await user.setPassword(password)
  user.isEmailVerified = !user.email // nothing to verify for a phone-only account

  let emailVerification = { required: false, sent: false }
  if (user.email) {
    emailVerification = await issueAndSendVerification(user)
  } else {
    await user.save()
  }

  return created(res, { ...session(user), emailVerification }, 'Account created')
})

/** POST /api/auth/verify-email */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body
  const hash = User.hashEmailVerificationToken(token)
  const user = await User.findOne({
    emailVerificationTokenHash: hash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires')

  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired.')

  user.isEmailVerified = true
  user.emailVerificationTokenHash = null
  user.emailVerificationExpires = null
  await user.save()

  return ok(res, session(user), 'Email verified')
})

/** POST /api/auth/resend-verification — never reveal whether the account exists. */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (user && !user.isEmailVerified) {
    const { sent, devLink } = await issueAndSendVerification(user)
    return ok(res, { sent, devLink }, 'If the account exists and is unverified, a new link was sent')
  }
  return ok(res, { sent: true }, 'If the account exists and is unverified, a new link was sent')
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
