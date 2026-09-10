import { z } from 'zod'
import {
  SEASONS, SOIL_TYPES, GROWTH_STAGES, IRRIGATION_TYPES, AREA_UNITS,
} from '../constants/agro.js'

const lower = (s) => z.string().trim().toLowerCase().pipe(s)
const isoDate = z.coerce.date()

/** Field shapes shared by create and update (no defaults - see below). */
const farmFields = {
  farmName: z.string().trim().min(1).max(80),
  area: z.coerce.number().positive().max(100000),
  areaUnit: z.enum(AREA_UNITS),

  location: z.string().trim().max(120),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),

  soilType: lower(z.enum(SOIL_TYPES)),
  irrigationType: lower(z.enum(IRRIGATION_TYPES)),

  currentCrop: z.string().trim().max(60),
  cropSeason: lower(z.enum(SEASONS)),
  sownOn: isoDate,
  growthStage: lower(z.enum(GROWTH_STAGES)),
  expectedHarvest: isoDate,
}

/** POST /api/farms - farmName + area required; areaUnit defaults to acre. */
export const farmCreateSchema = z.object({
  ...farmFields,
  areaUnit: farmFields.areaUnit.default('acre'),
  location: farmFields.location.optional(),
  latitude: farmFields.latitude.optional(),
  longitude: farmFields.longitude.optional(),
  soilType: farmFields.soilType.optional(),
  irrigationType: farmFields.irrigationType.optional(),
  currentCrop: farmFields.currentCrop.optional(),
  cropSeason: farmFields.cropSeason.optional(),
  sownOn: farmFields.sownOn.optional(),
  growthStage: farmFields.growthStage.optional(),
  expectedHarvest: farmFields.expectedHarvest.optional(),
}).strip()

/** PUT /api/farms/:id - every field optional, no defaults injected; >=1 required. */
export const farmUpdateSchema = z.object(farmFields).partial().strip().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Provide at least one field to update' },
)
