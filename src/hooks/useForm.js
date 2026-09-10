import { useCallback, useState } from 'react'
import { runValidators } from '@/lib/validation'

/**
 * Minimal controlled-form helper: values, per-field errors, and a validate()
 * that runs a { field: [validators] } schema. Deliberately tiny - no external
 * form library - so it stays readable and reusable across the app's forms.
 *
 * @param {object} initialValues
 * @param {Record<string, Function[]>} [schema]
 */
export function useForm(initialValues, schema = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }, [])

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target
      setField(name, type === 'checkbox' ? checked : value)
    },
    [setField],
  )

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const validate = useCallback(
    (extraSchema) => {
      const next = runValidators(values, extraSchema ?? schema)
      setErrors(next)
      setTouched(
        Object.keys(extraSchema ?? schema).reduce((acc, k) => ({ ...acc, [k]: true }), {}),
      )
      return Object.keys(next).length === 0
    },
    [values, schema],
  )

  const setFormError = useCallback((name, key) => {
    setErrors((prev) => ({ ...prev, [name]: key }))
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    submitting,
    setSubmitting,
    setField,
    setFormError,
    handleChange,
    handleBlur,
    validate,
    reset,
  }
}
