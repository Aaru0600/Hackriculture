import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { openapiSpec } from './docs/openapi.js'
import { notFound, errorHandler } from './middleware/error.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  // API docs - mounted before helmet so its CSP doesn't block Swagger UI assets.
  // Disabled when DOCS_ENABLED=false (the default in production).
  if (env.DOCS_ENABLED) {
    app.get('/api/docs.json', (_req, res) => res.json(openapiSpec))
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
      customSiteTitle: 'HACKRICULTURE API',
    }))
  }

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '256kb' }))
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'))

  if (!env.isTest) {
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests', error: null },
      }),
    )
  }

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
