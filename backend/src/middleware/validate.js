import { ApiError } from '../utils/ApiError.js'

/**
 * Build a middleware that parses `req[source]` with a Zod schema and replaces
 * it with the parsed (and coerced) value.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      return next(ApiError.badRequest('Validation failed', details))
    }
    // `req.query` is a getter-only property in Express - mutate it in place;
    // `req.body` / `req.params` can be replaced outright.
    if (source === 'query') {
      for (const key of Object.keys(req.query)) delete req.query[key]
      Object.assign(req.query, result.data)
    } else {
      req[source] = result.data
    }
    next()
  }
}
