import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, LocateFixed, User } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useForm } from '@/hooks/useForm'
import { useAuth } from '@/context/AuthContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/services/geoService'
import {
  email as isEmail,
  emailOrPhone,
  matches,
  minLength,
  numberInRange,
  required,
} from '@/lib/validation'
import { INDIA_STATES, FARM_SIZE_UNITS } from '@/data/indiaStates'
import { LANGUAGES } from '@/i18n'
import { PATHS } from '@/routes/paths'

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { register } = useAuth()
  const { status: geoStatus, request } = useGeolocation()
  const [formError, setFormError] = useState(null)

  const form = useForm({
    name: '',
    identifier: '',
    password: '',
    confirmPassword: '',
    state: '',
    district: '',
    preferredLanguage: i18n.resolvedLanguage || 'en',
    farmSize: '',
    farmSizeUnit: 'acre',
    terms: false,
  })

  const detectLocation = async () => {
    const coords = await request()
    if (!coords) return
    const place = await reverseGeocode(coords.latitude, coords.longitude, i18n.resolvedLanguage)
    if (place.admin1) {
      const match = INDIA_STATES.find(
        (s) => s.toLowerCase() === place.admin1.toLowerCase(),
      )
      if (match) form.setField('state', match)
    }
    if (place.name) form.setField('district', place.name)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    const schema = {
      name: [required],
      identifier: [emailOrPhone],
      password: [required, minLength(8)],
      confirmPassword: [required, matches(form.values.password)],
      state: [required],
      farmSize: [numberInRange(0.01, 100000)],
      terms: [(v) => (v ? null : 'validation.terms')],
    }
    if (!form.validate(schema)) return

    const identifier = form.values.identifier.trim()
    const looksEmail = isEmail(identifier) === null
    const payload = {
      name: form.values.name,
      email: looksEmail ? identifier : '',
      phone: looksEmail ? '' : identifier,
      password: form.values.password,
      state: form.values.state,
      district: form.values.district,
      preferredLanguage: form.values.preferredLanguage,
      farmSize: form.values.farmSize || null,
      farmSizeUnit: form.values.farmSizeUnit,
    }

    form.setSubmitting(true)
    try {
      await register(payload)
      i18n.changeLanguage(payload.preferredLanguage)
      navigate(PATHS.dashboard, { replace: true })
    } catch (err) {
      setFormError(err.message || t('auth.errors.generic'))
    } finally {
      form.setSubmitting(false)
    }
  }

  const err = (name) => (form.errors[name] ? t(form.errors[name]) : undefined)

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <span>
          {t('auth.register.haveAccount')}{' '}
          <Link to={PATHS.login} className="font-semibold text-brand-700 hover:underline">
            {t('common.login')}
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <FormInput
          name="name"
          label={t('auth.fields.name')}
          placeholder={t('auth.fields.namePlaceholder')}
          icon={<User className="h-4 w-4" />}
          value={form.values.name}
          onChange={form.handleChange}
          error={err('name')}
          autoComplete="name"
          required
        />

        <FormInput
          name="identifier"
          label={t('auth.fields.identifier')}
          placeholder={t('auth.fields.identifierPlaceholder')}
          value={form.values.identifier}
          onChange={form.handleChange}
          error={err('identifier')}
          autoComplete="username"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            name="password"
            label={t('auth.fields.password')}
            placeholder={t('auth.fields.newPasswordPlaceholder')}
            toggleLabel={t('auth.fields.showPassword')}
            value={form.values.password}
            onChange={form.handleChange}
            error={err('password')}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            name="confirmPassword"
            label={t('auth.fields.confirmPassword')}
            toggleLabel={t('auth.fields.showPassword')}
            value={form.values.confirmPassword}
            onChange={form.handleChange}
            error={err('confirmPassword')}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">{t('auth.fields.location')}</span>
          <button
            type="button"
            onClick={detectLocation}
            disabled={geoStatus === 'locating'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline disabled:opacity-60"
          >
            {geoStatus === 'locating' ? (
              <Spinner size={13} />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            {t('common.useMyLocation')}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            name="state"
            label={t('auth.fields.state')}
            placeholder={t('auth.fields.statePlaceholder')}
            options={INDIA_STATES.map((s) => ({ value: s, label: s }))}
            value={form.values.state}
            onChange={form.handleChange}
            error={err('state')}
            required
          />
          <FormInput
            name="district"
            label={t('auth.fields.district')}
            placeholder={t('auth.fields.districtPlaceholder')}
            value={form.values.district}
            onChange={form.handleChange}
            error={err('district')}
          />
        </div>

        <SelectInput
          name="preferredLanguage"
          label={t('auth.fields.language')}
          options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.native} (${l.label})` }))}
          value={form.values.preferredLanguage}
          onChange={form.handleChange}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <FormInput
            name="farmSize"
            type="number"
            step="0.01"
            min="0"
            label={t('auth.fields.farmSize')}
            placeholder="0.0"
            value={form.values.farmSize}
            onChange={form.handleChange}
            error={err('farmSize')}
            hint={t('auth.fields.farmSizeHint')}
          />
          <SelectInput
            name="farmSizeUnit"
            label={t('auth.fields.unit')}
            options={FARM_SIZE_UNITS.map((u) => ({ value: u.value, label: t(u.labelKey) }))}
            value={form.values.farmSizeUnit}
            onChange={form.handleChange}
          />
        </div>

        <Checkbox
          name="terms"
          label={t('auth.register.terms')}
          checked={form.values.terms}
          onChange={form.handleChange}
          error={err('terms')}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={form.submitting}
          iconRight={<ArrowRight className="h-4.5 w-4.5" />}
        >
          {form.submitting ? t('common.loading') : t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
