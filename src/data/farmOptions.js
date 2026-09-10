/**
 * Option lists + the crop timeline for the My Farm page. Enum values match the
 * Node backend's farm validator (`backend/src/validators/farmValidator.js`) so a
 * selection always saves cleanly in real mode.
 */

export const IRRIGATION_TYPES = ['canal', 'borewell', 'drip', 'sprinkler', 'rainfed', 'tank']

export const AREA_UNITS = ['acre', 'hectare', 'bigha']

export const FARM_SEASONS = ['kharif', 'rabi', 'summer', 'whole_year']

/**
 * Spec crop timeline (My Farm section). `germination` has no matching
 * growth-stage enum value, so it is a display-only step between sowing and
 * vegetative growth.
 */
export const CROP_TIMELINE = [
  'landPrep', 'sowing', 'germination', 'vegetative', 'flowering', 'harvest',
]

// growthStage (stored) -> index into CROP_TIMELINE.
const STAGE_TO_STEP = { sowing: 1, vegetative: 3, flowering: 4, maturity: 5 }

/** Which timeline step a farm is on. Null growthStage -> land preparation (0). */
export function timelineStep(growthStage) {
  return STAGE_TO_STEP[growthStage] ?? 0
}
