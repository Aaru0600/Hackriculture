import { z } from 'zod'
import { CROPS, SEASONS, SOIL_TYPES, GROWTH_STAGES, STATES } from '../constants/agro.js'

const lower = (s) => z.string().trim().toLowerCase().pipe(s)

/**
 * `POST /api/predictions/yield` body.
 *
 * Required: crop, state, season, farmSize (the real-data ML model needs them).
 * Optional: the agronomic-adjustment inputs from the spec's form steps 2-4.
 */
export const yieldInputSchema = z.object({
  crop: lower(z.enum(CROPS)),
  state: lower(z.enum(STATES)),
  district: z.string().trim().max(80).optional(),   // stored, not modelled
  season: lower(z.enum(SEASONS)),
  farmSize: z.coerce.number().positive().max(100000),

  // regional context (optional; ML fills sensible defaults if omitted)
  cropYear: z.coerce.number().int().min(1990).max(2035).optional(),
  rainfall: z.coerce.number().min(0).max(7000).optional(),        // annual mm
  fertilizerPerHa: z.coerce.number().min(0).max(500).optional(),
  pesticidePerHa: z.coerce.number().min(0).max(50).optional(),

  // agronomic adjustment inputs (spec form steps 2-4)
  soilType: lower(z.enum(SOIL_TYPES)).optional(),
  growthStage: lower(z.enum(GROWTH_STAGES)).optional(),
  nitrogen: z.coerce.number().min(0).max(400).optional(),
  phosphorus: z.coerce.number().min(0).max(200).optional(),
  potassium: z.coerce.number().min(0).max(200).optional(),
  soilPH: z.coerce.number().min(3.5).max(9.5).optional(),
  temperature: z.coerce.number().min(5).max(45).optional(),
  humidity: z.coerce.number().min(10).max(100).optional(),
  sowMonth: z.coerce.number().int().min(1).max(12).optional(),
  previousYield: z.coerce.number().min(0).max(200).optional(),  // stored, not modelled
}).strip()

export const historyQuerySchema = z.object({
  type: z.enum(['yield', 'crop', 'fertilizer', 'irrigation']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
