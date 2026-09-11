import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { PATHS } from '@/routes/paths'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { verifyEmail } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState(token ? 'verifying' : 'missing')
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true
    verifyEmail(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'))
  }, [token, verifyEmail])

  return (
    <AuthLayout title={t('auth.verifyEmail.title')} subtitle={t('auth.verifyEmail.subtitle')}>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm text-muted">{t('auth.verifyEmail.verifying')}</p>
          </>
        )}
        {status === 'done' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-semibold text-ink">{t('auth.verifyEmail.doneTitle')}</p>
            <p className="text-sm text-muted">{t('auth.verifyEmail.doneBody')}</p>
            <Button className="mt-2" onClick={() => navigate(PATHS.dashboard, { replace: true })}>
              {t('auth.verifyEmail.goToDashboard')}
            </Button>
          </>
        )}
        {(status === 'error' || status === 'missing') && (
          <>
            <AlertCircle className="h-10 w-10 text-danger" />
            <p className="font-semibold text-ink">{t('auth.verifyEmail.errorTitle')}</p>
            <p className="text-sm text-muted">{t('auth.verifyEmail.errorBody')}</p>
            <Link to={PATHS.login} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">
              {t('auth.verifyEmail.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
