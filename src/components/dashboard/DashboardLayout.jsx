import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './navItems'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopbar } from './DashboardTopbar'
import { MobileBottomNav } from './MobileBottomNav'
import { AssistantWidget } from '@/components/assistant/AssistantWidget'

/**
 * Authenticated shell: fixed sidebar on desktop, drawer + bottom nav on mobile.
 * Wraps every signed-in route via <Outlet />.
 */
export function DashboardLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const active = NAV_ITEMS.find((i) =>
    i.to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.to),
  )
  const title = active ? t(`dashboard.nav.${active.key}`) : 'HACKRICULTURE'

  return (
    <div className="min-h-svh bg-canvas">
      <DashboardSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-72">
        <DashboardTopbar title={title} onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
      <AssistantWidget />
    </div>
  )
}
