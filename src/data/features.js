import {
  Bot,
  CloudSun,
  Droplets,
  FlaskConical,
  History,
  Languages,
  Sprout,
  TrendingUp,
} from 'lucide-react'
import { PATHS } from '@/routes/paths'

/**
 * The eight platform capabilities from the brief. `i18nKey` points at
 * features.items.<key> in the locale files. Reused by the landing feature
 * grid and the "modules" section, and later by the dashboard nav.
 */
export const FEATURES = [
  { key: 'yield', icon: TrendingUp, to: PATHS.cropPrediction, accent: 'brand' },
  { key: 'cropReco', icon: Sprout, to: PATHS.cropRecommendation, accent: 'brand' },
  { key: 'fertilizer', icon: FlaskConical, to: PATHS.fertilizer, accent: 'earth' },
  { key: 'irrigation', icon: Droplets, to: PATHS.irrigation, accent: 'info' },
  { key: 'weather', icon: CloudSun, to: PATHS.weather, accent: 'harvest' },
  { key: 'assistant', icon: Bot, to: PATHS.aiAssistant, accent: 'brand' },
  { key: 'multilingual', icon: Languages, to: PATHS.profile, accent: 'earth' },
  { key: 'history', icon: History, to: PATHS.history, accent: 'info' },
]

export const ACCENT_CLASSES = {
  brand: 'bg-brand-100 text-brand-700 group-hover:bg-brand-600 group-hover:text-white',
  earth: 'bg-earth-100 text-earth-700 group-hover:bg-earth-600 group-hover:text-white',
  info: 'bg-info-soft text-info group-hover:bg-info group-hover:text-white',
  harvest: 'bg-harvest-100 text-harvest-700 group-hover:bg-harvest-500 group-hover:text-white',
}
