import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { farmCreateSchema, farmUpdateSchema } from '../validators/farmValidator.js'
import * as farms from '../controllers/farmController.js'

const router = Router()
router.use(authenticate)

router.get('/', farms.listFarms)
router.post('/', validate(farmCreateSchema), farms.createFarm)
router.get('/:id', farms.getFarm)
router.put('/:id', validate(farmUpdateSchema), farms.updateFarm)
router.delete('/:id', farms.deleteFarm)

export default router
