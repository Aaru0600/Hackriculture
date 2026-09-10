import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/context/AuthContext'
import { PATHS } from '@/routes/paths'
import { NAV_ITEMS } from './navItems'

/**
 * Left navigation. Fixed on desktop (lg+); slides in as a drawer on smaller
 * screens when `open` is true.
 */
export function DashboardSidebar({ open, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate(PATHS.home, { replace: true })
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-white transition-transform duration-200 lg:z-30 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-black/5 lg:hidden"
            aria-label={t('common.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ key, to, icon: Icon }) => (
              <li key={key}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  end={to === PATHS.dashboard}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink/70 hover:bg-black/5 hover:text-ink',
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.1} />
                  {t(`dashboard.nav.${key}`)}
                </NavLink>
              </li>
            ))}
            {isAdmin && (
              <li>
                <NavLink
                  to={PATHS.admin}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-earth-100 text-earth-800'
                        : 'text-ink/70 hover:bg-black/5 hover:text-ink',
                    )
                  }
                >
                  <span className="grid h-5 w-5 place-items-center rounded bg-earth-200 text-[10px] font-bold text-earth-800">
                    A
                  </span>
                  {t('dashboard.nav.admin')}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {(user?.name || '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-xs text-muted">
                {user?.email || user?.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="h-5 w-5" />
            {t('common.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
