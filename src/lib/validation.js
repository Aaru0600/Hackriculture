/**
 * Small field validators. Each returns an i18n key (under `validation.*`) on
 * failure, or null when the value is acceptable. Kept framework-free so the
 * same helpers work for auth forms and, later, the prediction forms.
 */

export const isBlank = (v) => v == null || String(v).trim() === ''

export function required(value) {
  return isBlank(value) ? 'validation.required' : null
}

export function email(value) {
  if (isBlank(value)) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
    ? null
    : 'validation.email'
}

/** Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix. */
export function phone(value) {
  if (isBlank(value)) return null
  const digits = String(value).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? null : 'validation.phone'
}

/** Accept either an email or an Indian mobile number. */
export function emailOrPhone(value) {
  if (isBlank(value)) return 'validation.required'
  return email(value) === null || phone(value) === null
    ? null
    : 'validation.emailOrPhone'
}

export const minLength = (n) => (value) =>
  isBlank(value) || String(value).length >= n ? null : 'validation.minLength'

export const matches = (otherValue) => (value) =>
  value === otherValue ? null : 'validation.passwordMatch'

export const numberInRange = (min, max) => (value) => {
  if (isBlank(value)) return null
  const num = Number(value)
  if (Number.isNaN(num)) return 'validation.number'
  if (num < min || num > max) return 'validation.range'
  return null
}

/** Run an object of { field: [validators] } against values -> { field: key }. */
export function runValidators(values, schema) {
  const errors = {}
  for (const [field, validators] of Object.entries(schema)) {
    for (const validate of validators) {
      const result = validate(values[field])
      if (result) {
        errors[field] = result
        break
      }
    }
  }
  return errors
}
