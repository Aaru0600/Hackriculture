import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  registerSchema, loginSchema, profileSchema, forgotPasswordSchema, changePasswordSchema,
} from '../validators/authValidator.js'
import * as auth from '../controllers/authController.js'

const router = Router()

// Tighter limit on the credential endpoints (disabled under test).
const authLimiter = env.isTest
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many attempts, try again later', error: null },
    })

router.post('/register', authLimiter, validate(registerSchema), auth.register)
router.post('/login', authLimiter, validate(loginSchema), auth.login)
router.post('/logout', auth.logout)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), auth.forgotPassword)

router.get('/me', authenticate, auth.me)
router.put('/profile', authenticate, validate(profileSchema), auth.updateProfile)
router.put('/password', authenticate, validate(changePasswordSchema), auth.changePassword)

export default router
