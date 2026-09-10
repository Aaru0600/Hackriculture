import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  cropRecSchema, irrigationRecSchema, fertilizerRecSchema, recHistoryQuerySchema,
} from '../validators/recommendationValidator.js'
import * as rec from '../controllers/recommendationController.js'

const router = Router()
router.use(authenticate)

router.post('/crop', validate(cropRecSchema), rec.createCropRecommendation)
router.post('/irrigation', validate(irrigationRecSchema), rec.createIrrigationRecommendation)
router.post('/fertilizer', validate(fertilizerRecSchema), rec.createFertilizerRecommendation)
router.get('/history', validate(recHistoryQuerySchema, 'query'), rec.listRecommendationHistory)
router.get('/:id', rec.getRecommendation)

export default router
