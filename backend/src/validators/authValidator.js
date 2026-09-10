import { z } from 'zod'

const LANGS = ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn']

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(80),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    state: z.string().trim().max(60).optional(),
    district: z.string().trim().max(80).optional(),
    preferredLanguage: z.enum(LANGS).optional(),
    farmSize: z.coerce.number().positive().optional(),
    farmSizeUnit: z.enum(['acre', 'hectare', 'bigha']).optional(),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Provide an email or a phone number',
    path: ['email'],
  })

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
})

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    state: z.string().trim().max(60).optional(),
    district: z.string().trim().max(80).optional(),
    preferredLanguage: z.enum(LANGS).optional(),
    farmSize: z.coerce.number().positive().nullable().optional(),
    farmSizeUnit: z.enum(['acre', 'hectare', 'bigha']).optional(),
    location: z
      .object({
        name: z.string().trim().max(120).optional(),
        latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
        longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
      })
      .optional(),
  })
  .strip()

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
})
