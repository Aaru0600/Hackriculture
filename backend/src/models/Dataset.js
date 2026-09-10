import mongoose from 'mongoose'

const { Schema, model } = mongoose

/**
 * A registry entry for a training dataset. This tracks dataset *metadata* only
 * (name, source, row count, checksum, status) - the raw CSVs live with the ML
 * service, not in Mongo. Admins curate the registry; there is no file upload
 * through the API.
 */
const datasetSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    task: { type: String, enum: ['yield', 'crop', 'irrigation', 'fertilizer', 'other'], default: 'other' },
    description: { type: String, trim: true, default: '', maxlength: 600 },
    source: { type: String, trim: true, default: '', maxlength: 300 },
    rows: { type: Number, default: null, min: 0 },
    sha256: { type: String, trim: true, default: '' },
    synthetic: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived', 'draft'], default: 'active' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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

export const Dataset = model('Dataset', datasetSchema)
