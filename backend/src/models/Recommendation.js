import mongoose from 'mongoose'

const { Schema, model } = mongoose

const recommendationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: Schema.Types.ObjectId, ref: 'Farm', default: null },
    kind: { type: String, enum: ['crop', 'fertilizer', 'irrigation'], required: true, index: true },

    input: { type: Schema.Types.Mixed, required: true },
    output: { type: Schema.Types.Mixed, required: true },

    // denormalised headline for cheap history listing
    summary: { type: String },
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

export const Recommendation = model('Recommendation', recommendationSchema)
