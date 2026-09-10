import mongoose from 'mongoose'

const { Schema, model } = mongoose

/**
 * Admin-editable notes about an ML model. Accuracy / version / last-trained come
 * live from the ML service's `/model-info`; this stores only the operational
 * status and free-text notes an admin sets from the panel. `key` is one of
 * yield | crop | irrigation.
 */
const modelRecordSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, enum: ['yield', 'crop', 'irrigation', 'fertilizer'] },
    status: { type: String, enum: ['production', 'staging', 'deprecated', 'retraining'], default: 'production' },
    notes: { type: String, trim: true, default: '', maxlength: 600 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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

export const ModelRecord = model('ModelRecord', modelRecordSchema)
