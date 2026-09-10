import { z } from 'zod'

const lat = z.coerce.number().min(-90).max(90)
const lon = z.coerce.number().min(-180).max(180)
const lang = z.string().trim().max(8).default('en')

export const latLonQuerySchema = z.object({ lat, lon, lang }).strip()

export const geoSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  lang,
}).strip()
