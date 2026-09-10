/**
 * Central route table. Matches the navigation contract in the project spec
 * so links stay consistent across navbar, sidebar and bottom nav.
 */
export const PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',

  dashboard: '/dashboard',
  cropPrediction: '/crop-prediction',
  cropRecommendation: '/crop-recommendation',
  fertilizer: '/fertilizer',
  irrigation: '/irrigation',
  weather: '/weather',
  myFarm: '/my-farm',
  alerts: '/alerts',
  history: '/history',
  aiAssistant: '/ai-assistant',
  profile: '/profile',

  admin: '/admin',
  adminUsers: '/admin/users',
  adminDatasets: '/admin/datasets',
  adminModels: '/admin/models',
  adminReports: '/admin/reports',
}
