import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PATHS } from './paths'
import { RequireAuth, RequireAdmin } from './RequireAuth'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AdminShell } from '@/components/admin/AdminShell'
import LandingPage from '@/pages/LandingPage'

// Route components are code-split so the landing route stays light on mobile.
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const WeatherPage = lazy(() => import('@/pages/WeatherPage'))
const CropPredictionPage = lazy(() => import('@/pages/CropPredictionPage'))
const CropRecommendationPage = lazy(() => import('@/pages/CropRecommendationPage'))
const FertilizerPage = lazy(() => import('@/pages/FertilizerPage'))
const IrrigationPage = lazy(() => import('@/pages/IrrigationPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const MyFarmPage = lazy(() => import('@/pages/MyFarmPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const LearnPage = lazy(() => import('@/pages/LearnPage'))
const PlaceholderPage = lazy(() => import('@/pages/PlaceholderPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminDatasetsPage = lazy(() => import('@/pages/admin/AdminDatasetsPage'))
const AdminModelsPage = lazy(() => import('@/pages/admin/AdminModelsPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'))

/**
 * Route table. Landing + auth are public; the signed-in app renders inside the
 * DashboardLayout shell; the admin area renders inside its own AdminShell.
 */
const PROTECTED_STUBS = [
  [PATHS.aiAssistant, 'KrishiAI Assistant'],
]

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path={PATHS.home} element={<LandingPage />} />
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.register} element={<RegisterPage />} />
      <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path="/learn/:slug" element={<LearnPage />} />

      {/* Signed-in app - inside the dashboard shell */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route path={PATHS.weather} element={<WeatherPage />} />
          <Route path={PATHS.cropPrediction} element={<CropPredictionPage />} />
          <Route path={PATHS.cropRecommendation} element={<CropRecommendationPage />} />
          <Route path={PATHS.fertilizer} element={<FertilizerPage />} />
          <Route path={PATHS.irrigation} element={<IrrigationPage />} />
          <Route path={PATHS.myFarm} element={<MyFarmPage />} />
          <Route path={PATHS.alerts} element={<AlertsPage />} />
          <Route path={PATHS.history} element={<HistoryPage />} />
          <Route path={PATHS.profile} element={<ProfilePage />} />
          {PROTECTED_STUBS.map(([path, title]) => (
            <Route key={path} path={path} element={<PlaceholderPage title={title} inShell />} />
          ))}
        </Route>
      </Route>

      {/* Admin only - separate shell */}
      <Route element={<RequireAdmin />}>
        <Route element={<AdminShell />}>
          <Route path={PATHS.admin} element={<AdminDashboardPage />} />
          <Route path={PATHS.adminUsers} element={<AdminUsersPage />} />
          <Route path={PATHS.adminDatasets} element={<AdminDatasetsPage />} />
          <Route path={PATHS.adminModels} element={<AdminModelsPage />} />
          <Route path={PATHS.adminReports} element={<AdminReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={PATHS.home} replace />} />
    </Routes>
  )
}
