import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import {
  listQuerySchema, userUpdateSchema, datasetCreateSchema, datasetUpdateSchema, modelUpdateSchema,
} from '../validators/adminValidator.js'
import * as admin from '../controllers/adminController.js'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/stats', admin.getStats)

router.get('/users', validate(listQuerySchema, 'query'), admin.listUsers)
router.patch('/users/:id', validate(userUpdateSchema), admin.updateUser)
router.delete('/users/:id', admin.deleteUser)

router.get('/predictions', validate(listQuerySchema, 'query'), admin.listPredictions)
router.get('/recommendations', validate(listQuerySchema, 'query'), admin.listRecommendations)

router.get('/models', admin.listModels)
router.patch('/models/:key', validate(modelUpdateSchema), admin.updateModel)

router.get('/datasets', admin.listDatasets)
router.post('/datasets', validate(datasetCreateSchema), admin.createDataset)
router.patch('/datasets/:id', validate(datasetUpdateSchema), admin.updateDataset)
router.delete('/datasets/:id', admin.deleteDataset)

export default router
