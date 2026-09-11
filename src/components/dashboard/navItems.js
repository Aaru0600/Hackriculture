import {
  Bell,
  CloudSun,
  Droplets,
  FlaskConical,
  History,
  LayoutDashboard,
  Sprout,
  Tractor,
  TrendingUp,
  User,
} from 'lucide-react'
import { PATHS } from '@/routes/paths'

/**
 * Primary navigation for the signed-in app. `labelKey` resolves to
 * dashboard.nav.<key>. Shared by the desktop sidebar and the mobile bottom nav.
 * KrishiAI assistant is NOT listed here - it lives as the bottom-right
 * `AssistantWidget` FAB (mounted in `DashboardLayout`), reachable from every page.
 */
export const NAV_ITEMS = [
  { key: 'dashboard', to: PATHS.dashboard, icon: LayoutDashboard },
  { key: 'cropPrediction', to: PATHS.cropPrediction, icon: TrendingUp },
  { key: 'cropRecommendation', to: PATHS.cropRecommendation, icon: Sprout },
  { key: 'fertilizer', to: PATHS.fertilizer, icon: FlaskConical },
  { key: 'irrigation', to: PATHS.irrigation, icon: Droplets },
  { key: 'weather', to: PATHS.weather, icon: CloudSun },
  { key: 'alerts', to: PATHS.alerts, icon: Bell },
  { key: 'myFarm', to: PATHS.myFarm, icon: Tractor },
  { key: 'history', to: PATHS.history, icon: History },
  { key: 'profile', to: PATHS.profile, icon: User },
]

// Mobile bottom bar: five biggest touch targets (spec section 15).
export const BOTTOM_NAV_KEYS = ['dashboard', 'cropPrediction', 'cropRecommendation', 'weather', 'profile']
