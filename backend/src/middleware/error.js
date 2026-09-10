import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500
  let message = err.message || 'Internal server error'
  let details = err.details ?? null

  // Mongoose / Mongo specifics
  if (err.name === 'ValidationError') {
    status = 400
    message = 'Validation failed'
    details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    )
  } else if (err.code === 11000) {
    status = 409
    message = 'An account with these details already exists'
    details = err.keyValue ?? null
  } else if (err.name === 'CastError') {
    status = 400
    message = `Invalid ${err.path}`
  }

  if (status >= 500 && !env.isTest) {
    console.error('[error]', err)
  }

  res.status(status).json({
    success: false,
    message,
    error: details,
  })
}
