import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { PATHS } from './paths'

/** Gate for signed-in routes. Remembers where the user was headed. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-svh place-items-center bg-canvas text-brand-600">
        <Spinner size={28} />
      </div>
    )
  }

  if (status !== 'authed') {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />
  }

  return <Outlet />
}

/** Gate for admin-only routes. Farmers are bounced to their dashboard. */
export function RequireAdmin() {
  const { status, isAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-svh place-items-center bg-canvas text-brand-600">
        <Spinner size={28} />
      </div>
    )
  }

  if (status !== 'authed') {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return <Outlet />
}
