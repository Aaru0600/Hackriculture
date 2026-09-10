/**
 * Indian States and Union Territories - used in the registration form.
 * District is captured as free text (optionally prefilled from the browser
 * location) so we don't ship a large, error-prone district dataset; a proper
 * state -> district lookup can come from the backend later.
 */
export const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

export const FARM_SIZE_UNITS = [
  { value: 'acre', labelKey: 'auth.units.acre' },
  { value: 'hectare', labelKey: 'auth.units.hectare' },
  { value: 'bigha', labelKey: 'auth.units.bigha' },
]
