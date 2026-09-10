import { z } from 'zod'

export const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strip()

export const userUpdateSchema = z.object({
  role: z.enum(['farmer', 'admin']),
}).strip()

export const datasetCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  task: z.enum(['yield', 'crop', 'irrigation', 'fertilizer', 'other']).default('other'),
  description: z.string().trim().max(600).optional(),
  source: z.string().trim().max(300).optional(),
  rows: z.coerce.number().int().min(0).optional(),
  sha256: z.string().trim().max(80).optional(),
  synthetic: z.coerce.boolean().optional(),
  status: z.enum(['active', 'archived', 'draft']).default('active'),
}).strip()

export const datasetUpdateSchema = datasetCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Provide at least one field to update' },
)

export const modelUpdateSchema = z.object({
  status: z.enum(['production', 'staging', 'deprecated', 'retraining']).optional(),
  notes: z.string().trim().max(600).optional(),
}).strip().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })
