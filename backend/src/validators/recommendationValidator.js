import { z } from 'zod'
import { CROPS, SOIL_TYPES, SEASONS, GROWTH_STAGES } from '../constants/agro.js'

const lower = (s) => z.string().trim().toLowerCase().pipe(s)

/** POST /api/recommendations/crop  (spec inputs; the ML model uses N-P-K + climate) */
export const cropRecSchema = z.object({
  nitrogen: z.coerce.number().min(0).max(200),
  phosphorus: z.coerce.number().min(0).max(200),
  potassium: z.coerce.number().min(0).max(220),
  temperature: z.coerce.number().min(5).max(45),
  humidity: z.coerce.number().min(5).max(100),
  soilPH: z.coerce.number().min(3).max(10),
  rainfall: z.coerce.number().min(10).max(320),   // mm over the growing period
  soilType: lower(z.enum(SOIL_TYPES)).optional(),
  season: lower(z.enum(SEASONS)).optional(),
  state: z.string().trim().max(60).optional(),      // stored, not modelled
  district: z.string().trim().max(80).optional(),
  topN: z.coerce.number().int().min(1).max(6).default(3),
}).strip()

export const recHistoryQuerySchema = z.object({
  kind: z.enum(['crop', 'fertilizer', 'irrigation']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** POST /api/recommendations/fertilizer  (rule-based; no ML model) */
export const fertilizerRecSchema = z.object({
  crop: lower(z.enum(CROPS)),
  nitrogen: z.coerce.number().min(0).max(400),
  phosphorus: z.coerce.number().min(0).max(300),
  potassium: z.coerce.number().min(0).max(400),
  soilPH: z.coerce.number().min(3).max(10).optional(),
  growthStage: lower(z.enum(GROWTH_STAGES)).optional(),
  soilType: lower(z.enum(SOIL_TYPES)).optional(),
  state: z.string().trim().max(60).optional(),
  district: z.string().trim().max(80).optional(),
}).strip()

/** POST /api/recommendations/irrigation */
export const irrigationRecSchema = z.object({
  crop: lower(z.enum(CROPS)),
  state: z.string().trim().max(60).optional(),      // stored, not modelled
  district: z.string().trim().max(80).optional(),
  soilType: lower(z.enum(SOIL_TYPES)).optional(),
  growthStage: lower(z.enum(GROWTH_STAGES)).optional(),
  soilMoisture: z.coerce.number().min(0).max(100).optional(),      // % v/v
  temperature: z.coerce.number().min(5).max(50).optional(),
  humidity: z.coerce.number().min(5).max(100).optional(),
  rainfall: z.coerce.number().min(0).max(3000).optional(),         // recent mm
  forecastRainProbability: z.coerce.number().min(0).max(100).optional(),
  farmSize: z.coerce.number().positive().max(100000).optional(),
  irrigationType: z.enum(['canal', 'drip', 'rainfed', 'sprinkler']).optional(),
}).strip()
