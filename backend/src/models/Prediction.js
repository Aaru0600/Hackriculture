import mongoose from 'mongoose'
import { PREDICTION_TYPES } from '../constants/agro.js'

const { Schema, model } = mongoose

const predictionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: Schema.Types.ObjectId, ref: 'Farm', default: null },
    type: { type: String, enum: PREDICTION_TYPES, required: true, index: true },

    // exactly what the client sent (camelCase), for history + reproducibility
    input: { type: Schema.Types.Mixed, required: true },
    // the full ML service response
    output: { type: Schema.Types.Mixed, required: true },

    // denormalised headline fields for cheap history listing / analytics
    predictedYield: { type: Number },
    unit: { type: String, default: 'tons/hectare' },
    predictionQuality: { type: Number },       // 0-100 model score, NOT a probability
    predictionQualityLabel: { type: String, enum: ['high', 'medium', 'low'] },
    riskLevel: { type: String, enum: ['low', 'moderate', 'high'] },
    modelVersion: { type: String },
    modelSource: { type: String },
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

export const Prediction = model('Prediction', predictionSchema)
