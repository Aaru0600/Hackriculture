import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

const { Schema, model } = mongoose

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String, trim: true, lowercase: true,
      unique: true, sparse: true,
    },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },

    // Proof the farmer actually owns the email they registered with.
    // Accounts registered by phone only have nothing to verify, so they
    // default to verified (set explicitly by the controller on create).
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },

    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn'],
      default: 'en',
    },
    farmSize: { type: Number, default: null },
    farmSizeUnit: { type: String, enum: ['acre', 'hectare', 'bigha'], default: 'acre' },
    location: {
      name: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        delete ret.emailVerificationTokenHash
        delete ret.emailVerificationExpires
        return ret
      },
    },
  },
)

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10)
}

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

/**
 * Generates a fresh verification token, stores only its hash + expiry (like a
 * password-reset token), and returns the raw value to put in the email link.
 * Caller is responsible for `.save()`.
 */
userSchema.methods.issueEmailVerificationToken = function issueEmailVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex')
  this.emailVerificationTokenHash = hashToken(raw)
  this.emailVerificationExpires = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MIN * 60 * 1000)
  return raw
}

userSchema.statics.hashEmailVerificationToken = hashToken

/** Public shape (also enforced by toJSON, but handy when we have a lean doc). */
userSchema.methods.toPublic = function toPublic() {
  return this.toJSON()
}

export const User = model('User', userSchema)
