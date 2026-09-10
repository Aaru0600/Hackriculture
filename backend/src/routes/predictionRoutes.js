import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { yieldInputSchema, historyQuerySchema } from '../validators/yieldValidator.js'
import * as predictions from '../controllers/predictionController.js'

const router = Router()

router.use(authenticate)

router.post('/yield', validate(yieldInputSchema), predictions.createYieldPrediction)
router.get('/history', validate(historyQuerySchema, 'query'), predictions.listHistory)
router.get('/:id', predictions.getPrediction)

export default router
