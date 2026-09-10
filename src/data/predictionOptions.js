/**
 * Option lists for the yield-prediction form. Crops / states / seasons match the
 * ML service's trained vocabulary (`ml-service/src/features.py`), so a selection
 * always validates on the backend.
 */

export const YIELD_CROPS = [
  'rice', 'wheat', 'maize', 'cotton',
  'sugarcane', 'soybean', 'groundnut', 'potato',
]

export const YIELD_SEASONS = [
  { value: 'kharif', labelKey: 'predict.seasons.kharif' },
  { value: 'rabi', labelKey: 'predict.seasons.rabi' },
  { value: 'summer', labelKey: 'predict.seasons.summer' },
  { value: 'whole_year', labelKey: 'predict.seasons.wholeYear' },
]

export const SOIL_TYPES = [
  'alluvial', 'black', 'red', 'laterite',
  'sandy', 'clayey', 'loamy', 'silty',
]

export const GROWTH_STAGES = ['sowing', 'vegetative', 'flowering', 'maturity']

// The 30 states present in the yield dataset (Title Case for display).
export const YIELD_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
