/**
 * Vocabularies shared with the Python ML service (`ml-service/src/features.py`).
 * Keep these two lists in sync.
 */
export const CROPS = [
  'rice', 'wheat', 'maize', 'cotton',
  'sugarcane', 'soybean', 'groundnut', 'potato',
]

export const SEASONS = ['kharif', 'rabi', 'summer', 'autumn', 'winter', 'whole_year']

export const SOIL_TYPES = [
  'alluvial', 'black', 'red', 'laterite',
  'sandy', 'clayey', 'loamy', 'silty',
]

export const GROWTH_STAGES = ['sowing', 'vegetative', 'flowering', 'maturity']

// Common on-farm water-supply methods (used by the Farm profile; not modelled).
export const IRRIGATION_TYPES = ['canal', 'borewell', 'drip', 'sprinkler', 'rainfed', 'tank']

export const AREA_UNITS = ['acre', 'hectare', 'bigha']

export const STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'delhi', 'goa', 'gujarat', 'haryana', 'himachal pradesh',
  'jammu and kashmir', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha',
  'puducherry', 'punjab', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal',
]

export const PREDICTION_TYPES = ['yield', 'crop', 'fertilizer', 'irrigation']
