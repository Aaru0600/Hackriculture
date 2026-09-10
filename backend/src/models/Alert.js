import mongoose from 'mongoose'

const { Schema, model } = mongoose

/**
 * A farming alert for one user, derived from the weather forecast (and a couple
 * of crop-cycle rules) by `services/alertEngine.js`. Regenerated on every
 * `GET /api/alerts`; `key` dedupes a condition per scope so the read flag and
 * created time survive regeneration.
 */
const alertSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: Schema.Types.ObjectId, ref: 'Farm', default: null },

    key: { type: String, required: true },            // `${scope}:${type}`
    type: { type: String, required: true },           // heavyRain | heat | ...
    severity: { type: String, enum: ['info', 'warning', 'danger'], default: 'info' },

    i18nKey: { type: String, required: true },         // farmAlerts.<type>
    values: { type: Schema.Types.Mixed, default: {} }, // interpolation values
    title: { type: String, default: '' },             // rendered English
    body: { type: String, default: '' },
    scopeLabel: { type: String, default: '' },
    isSavedLocation: { type: Boolean, default: false },

    read: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
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

alertSchema.index({ user: 1, key: 1 }, { unique: true })

export const Alert = model('Alert', alertSchema)
