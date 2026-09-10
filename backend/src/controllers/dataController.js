import { asyncHandler } from '../utils/asyncHandler.js'
import { ok } from '../utils/ApiResponse.js'
import * as providers from '../services/dataProviders.js'

/** GET /api/weather/bundle?lat&lon */
export const getWeatherBundle = asyncHandler(async (req, res) => {
  const { lat, lon } = req.query
  return ok(res, await providers.weatherBundle(lat, lon), 'Weather bundle')
})

/** GET /api/geo/search?q&lang */
export const searchPlaces = asyncHandler(async (req, res) => {
  const { q, lang } = req.query
  return ok(res, await providers.geoSearch(q, lang), 'Places')
})

/** GET /api/geo/reverse?lat&lon&lang */
export const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lon, lang } = req.query
  return ok(res, await providers.geoReverse(lat, lon, lang), 'Place')
})

/** GET /api/soil/estimate?lat&lon */
export const getSoilEstimate = asyncHandler(async (req, res) => {
  const { lat, lon } = req.query
  return ok(res, await providers.soilEstimate(lat, lon), 'Soil estimate')
})
