import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Users, Database, Boxes, FileBarChart, ArrowLeft, LogOut,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useAuth } from '@/context/AuthContext'
import { PATHS } from '@/routes/paths'
import { cn } from '@/lib/cn'

const TABS = [
  { to: PATHS.admin, key: 'overview', icon: LayoutDashboard, end: true },
  { to: PATHS.adminUsers, key: 'users', icon: Users },
  { to: PATHS.adminDatasets, key: 'datasets', icon: Database },
  { to: PATHS.adminModels, key: 'models', icon: Boxes },
  { to: PATHS.adminReports, key: 'reports', icon: FileBarChart },
]

export function AdminShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const signOut = async () => {
    await logout()
    navigate(PATHS.home, { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-800">
              {t('admin.badge')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" to={PATHS.dashboard} iconLeft={<ArrowLeft className="h-4 w-4" />}>
              {t('admin.backToApp')}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} iconLeft={<LogOut className="h-4 w-4" />}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {TABS.map(({ to, key, icon: Icon, end }) => (
              <li key={key}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                      isActive
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-muted hover:text-ink',
                    )
                  }
                >
                  <Icon size={15} /> {t(`admin.tabs.${key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-muted">
          {t('admin.signedInAs', { name: user?.name || 'admin' })}
        </p>
        <Outlet />
      </main>
    </div>
  )
}
