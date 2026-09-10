import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as alerts from '../controllers/alertController.js'

const router = Router()
router.use(authenticate)

router.get('/', alerts.listAlerts)
router.put('/read-all', alerts.markAllAlertsRead)
router.put('/:id/read', alerts.markAlertRead)

export default router
