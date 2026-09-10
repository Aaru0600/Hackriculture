import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { latLonQuerySchema, geoSearchQuerySchema } from '../validators/dataValidator.js'
import * as data from '../controllers/dataController.js'

// Public - these proxy keyless providers and expose nothing sensitive. The
// global rate-limiter in app.js still applies.
const router = Router()

router.get('/weather/bundle', validate(latLonQuerySchema, 'query'), data.getWeatherBundle)
router.get('/geo/search', validate(geoSearchQuerySchema, 'query'), data.searchPlaces)
router.get('/geo/reverse', validate(latLonQuerySchema, 'query'), data.reverseGeocode)
router.get('/soil/estimate', validate(latLonQuerySchema, 'query'), data.getSoilEstimate)

export default router
