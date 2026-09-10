import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { useForm } from '@/hooks/useForm'
import { emailOrPhone } from '@/lib/validation'
import { forgotPassword } from '@/services/authService'
import { PATHS } from '@/routes/paths'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState(null)
  const form = useForm({ identifier: '' })

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.validate({ identifier: [emailOrPhone] })) return
    form.setSubmitting(true)
    try {
      await forgotPassword(form.values.identifier.trim())
      setSent(true)
    } catch (err) {
      setFormError(err.message || t('auth.errors.generic'))
    } finally {
      form.setSubmitting(false)
    }
  }

  const err = form.errors.identifier ? t(form.errors.identifier) : undefined

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={sent ? undefined : t('auth.forgot.subtitle')}
      footer={
        <Link
          to={PATHS.login}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.forgot.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl bg-success-soft p-5 text-sm text-success">
          <MailCheck className="h-6 w-6" />
          <p className="mt-3 font-semibold text-ink">{t('auth.forgot.sentTitle')}</p>
          <p className="mt-1 text-muted">{t('auth.forgot.sentBody')}</p>
        </div>
      ) : (
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
            value={form.values.identifier}
            onChange={form.handleChange}
            error={err}
            autoComplete="username"
            required
          />
          <Button type="submit" size="lg" fullWidth disabled={form.submitting}>
            {form.submitting ? t('common.loading') : t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
