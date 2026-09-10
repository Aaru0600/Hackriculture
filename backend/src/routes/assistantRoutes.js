import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { chatSchema } from '../validators/assistantValidator.js'
import * as assistant from '../controllers/assistantController.js'

const router = Router()

const chatLimiter = env.isTest
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Slow down - too many messages', error: null },
    })

router.post('/chat', authenticate, chatLimiter, validate(chatSchema), assistant.chat)

export default router
