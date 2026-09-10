import { Router } from 'express'
import authRoutes from './authRoutes.js'
import farmRoutes from './farmRoutes.js'
import predictionRoutes from './predictionRoutes.js'
import recommendationRoutes from './recommendationRoutes.js'
import assistantRoutes from './assistantRoutes.js'
import dataRoutes from './dataRoutes.js'
import alertRoutes from './alertRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import adminRoutes from './adminRoutes.js'
import { mlHealth } from '../services/mlService.js'
import { ok } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get(
  '/health',
  asyncHandler(async (_req, res) =>
    ok(res, { status: 'ok', ml: await mlHealth(), time: new Date().toISOString() }),
  ),
)

router.use('/auth', authRoutes)
router.use('/farms', farmRoutes)
router.use('/predictions', predictionRoutes)
router.use('/recommendations', recommendationRoutes)
router.use('/assistant', assistantRoutes)
router.use('/alerts', alertRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/admin', adminRoutes)

// Keyless data-provider proxy (weather / geo / soil) - mounted at /api root.
router.use('/', dataRoutes)

export default router
