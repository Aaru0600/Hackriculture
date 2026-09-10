import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { PATHS } from '@/routes/paths'
import { NAV_ITEMS, BOTTOM_NAV_KEYS } from './navItems'

/** Fixed bottom navigation for phones (spec section 15). Large touch targets. */
export function MobileBottomNav() {
  const { t } = useTranslation()
  const items = BOTTOM_NAV_KEYS.map((k) => NAV_ITEMS.find((i) => i.key === k))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ key, to, icon: Icon }) => (
          <li key={key}>
            <NavLink
              to={to}
              end={to === PATHS.dashboard}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-brand-700' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-9 w-14 place-items-center rounded-full transition-colors',
                      isActive && 'bg-brand-100',
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  {t(`dashboard.bottomNav.${key}`)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
