import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HardHat, LogOut } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useAuth } from '@/context/AuthContext'
import { PATHS } from '@/routes/paths'

/**
 * Temporary stand-in for routes whose full UI isn't built yet. `inShell` mode
 * renders just the centered body (the DashboardLayout already provides the
 * chrome); standalone mode adds its own header + auth controls.
 */
export default function PlaceholderPage({ title, inShell = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate(PATHS.home, { replace: true })
  }

  const body = (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {isAuthenticated && !inShell && (
        <p className="mb-4 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">
          {t('auth.signedInAs', { name: user?.name || t('common.login') })}
          {user?.role === 'admin' ? ' · admin' : ''}
        </p>
      )}
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
        <HardHat className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-muted">
        This screen is part of an upcoming build phase. The route is wired and
        protected - its full UI lands soon.
      </p>
      <Link
        to={isAuthenticated ? PATHS.dashboard : PATHS.home}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {isAuthenticated ? t('dashboard.nav.dashboard') : t('common.backToHome')}
      </Link>
    </div>
  )

  if (inShell) return body

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                iconLeft={<LogOut className="h-4 w-4" />}
              >
                {t('common.logout')}
              </Button>
            )}
          </div>
        </Container>
      </header>
      <Container className="flex-1">{body}</Container>
    </div>
  )
}
