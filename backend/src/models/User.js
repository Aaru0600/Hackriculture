import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

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

/** Public shape (also enforced by toJSON, but handy when we have a lean doc). */
userSchema.methods.toPublic = function toPublic() {
  return this.toJSON()
}

export const User = model('User', userSchema)
