import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/User.js'

/** Sign a session token for a user document. */
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

/** Require a valid Bearer token; attaches `req.user` (a User document). */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw ApiError.unauthorized('Missing bearer token')

    let payload
    try {
      payload = jwt.verify(token, env.JWT_SECRET)
    } catch {
      throw ApiError.unauthorized('Invalid or expired token')
    }

    const user = await User.findById(payload.sub)
    if (!user) throw ApiError.unauthorized('Account no longer exists')

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/** Must run after `authenticate`. */
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(ApiError.forbidden('Admin access required'))
  next()
}
