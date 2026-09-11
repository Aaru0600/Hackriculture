import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MailWarning, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { resendVerification } from '@/services/authService'

/** Converts either an absolute email link or our own mock relative path into an in-app route. */
function toInAppPath(link) {
  try {
    const url = new URL(link, window.location.origin)
    return `${url.pathname}${url.search}`
  } catch {
    return link
  }
}

/** Persistent reminder for accounts whose email hasn't been confirmed yet. */
export function EmailVerifyBanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [devLink, setDevLink] = useState(null)

  if (!user?.email || user.isEmailVerified) return null

  const resend = async () => {
    setState('sending')
    setDevLink(null)
    try {
      const { devLink: link } = await resendVerification(user.email)
      setState('sent')
      if (link) setDevLink(link)
    } catch {
      setState('error')
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-warning-soft px-4 py-2.5 text-sm text-warning">
        <MailWarning size={16} className="shrink-0" />
        <span className="flex-1">{t('auth.verifyBanner.message', { email: user.email })}</span>
        {state !== 'sent' && (
          <button
            type="button"
            onClick={resend}
            disabled={state === 'sending'}
            className="shrink-0 font-semibold underline decoration-dotted underline-offset-2 disabled:opacity-60"
          >
            {state === 'sending'
              ? <Loader2 size={13} className="inline animate-spin" />
              : t('auth.verifyBanner.resend')}
          </button>
        )}
        {state === 'sent' && !devLink && (
          <span className="shrink-0 font-semibold">{t('auth.verifyBanner.sent')}</span>
        )}
        {state === 'sent' && devLink && (
          <Link to={toInAppPath(devLink)} className="shrink-0 font-semibold underline underline-offset-2">
            {t('auth.verifyBanner.devLink')}
          </Link>
        )}
        {state === 'error' && (
          <span className="shrink-0 text-danger">{t('auth.verifyBanner.error')}</span>
        )}
      </div>
    </div>
  )
}
