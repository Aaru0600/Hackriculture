import mongoose from 'mongoose'
import {
  SEASONS, SOIL_TYPES, GROWTH_STAGES, IRRIGATION_TYPES, AREA_UNITS,
} from '../constants/agro.js'

const { Schema, model } = mongoose

/**
 * A farmer's field. A user can own several. Soil / crop details are stored as
 * plain profile data - the ML services are never called from here.
 */
const farmSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    farmName: { type: String, required: true, trim: true, maxlength: 80 },
    area: { type: Number, required: true, min: 0.01, max: 100000 },
    areaUnit: { type: String, enum: AREA_UNITS, default: 'acre' },

    location: { type: String, trim: true, default: '', maxlength: 120 },
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },

    soilType: { type: String, enum: SOIL_TYPES, default: null },
    irrigationType: { type: String, enum: IRRIGATION_TYPES, default: null },

    // Current crop cycle (My Farm "Current Crop" card + timeline).
    currentCrop: { type: String, trim: true, default: '', maxlength: 60 },
    cropSeason: { type: String, enum: SEASONS, default: null },
    sownOn: { type: Date, default: null },
    growthStage: { type: String, enum: GROWTH_STAGES, default: null },
    expectedHarvest: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

export const Farm = model('Farm', farmSchema)
