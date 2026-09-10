import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, Mail } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { FormInput } from '@/components/ui/FormInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { useForm } from '@/hooks/useForm'
import { useAuth } from '@/context/AuthContext'
import { emailOrPhone, required } from '@/lib/validation'
import { PATHS } from '@/routes/paths'
import { DEMO_ADMIN } from '@/services/authService'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [formError, setFormError] = useState(null)

  const from = location.state?.from?.pathname || PATHS.dashboard

  const form = useForm(
    { identifier: '', password: '', remember: true },
    { identifier: [emailOrPhone], password: [required] },
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.validate()) return
    form.setSubmitting(true)
    try {
      await login({ identifier: form.values.identifier, password: form.values.password })
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err.message || t('auth.errors.generic'))
    } finally {
      form.setSubmitting(false)
    }
  }

  const err = (name) => (form.errors[name] ? t(form.errors[name]) : undefined)

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <span>
          {t('auth.login.noAccount')}{' '}
          <Link to={PATHS.register} className="font-semibold text-brand-700 hover:underline">
            {t('common.register')}
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
          name="identifier"
          label={t('auth.fields.identifier')}
          placeholder={t('auth.fields.identifierPlaceholder')}
          icon={<Mail className="h-4 w-4" />}
          value={form.values.identifier}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={err('identifier')}
          autoComplete="username"
          required
        />

        <PasswordInput
          name="password"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.passwordPlaceholder')}
          toggleLabel={t('auth.fields.showPassword')}
          value={form.values.password}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={err('password')}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox
            name="remember"
            label={t('auth.login.remember')}
            checked={form.values.remember}
            onChange={form.handleChange}
          />
          <Link
            to={PATHS.forgotPassword}
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={form.submitting}
          iconRight={<ArrowRight className="h-4.5 w-4.5" />}
        >
          {form.submitting ? t('common.loading') : t('auth.login.submit')}
        </Button>

        {import.meta.env.DEV && (
          <p className="rounded-lg bg-black/[0.03] p-2.5 text-center text-xs text-muted">
            {t('auth.login.demoHint')}: <code>{DEMO_ADMIN.identifier}</code> /{' '}
            <code>{DEMO_ADMIN.password}</code>
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
