/**
 * Operational error with an HTTP status. Thrown by controllers/services and
 * turned into a `{ success:false, message, error }` body by the error middleware.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true
  }

  static badRequest(msg, details) { return new ApiError(400, msg, details) }
  static unauthorized(msg = 'Not authenticated') { return new ApiError(401, msg) }
  static forbidden(msg = 'Not authorised') { return new ApiError(403, msg) }
  static notFound(msg = 'Not found') { return new ApiError(404, msg) }
  static conflict(msg) { return new ApiError(409, msg) }
  static badGateway(msg, details) { return new ApiError(502, msg, details) }
  static unavailable(msg, details) { return new ApiError(503, msg, details) }
}
