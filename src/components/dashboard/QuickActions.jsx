import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Droplets, FlaskConical, Sprout, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PATHS } from '@/routes/paths'

const ACTIONS = [
  { key: 'yield', to: PATHS.cropPrediction, icon: TrendingUp, tone: 'bg-brand-100 text-brand-700' },
  { key: 'crop', to: PATHS.cropRecommendation, icon: Sprout, tone: 'bg-brand-100 text-brand-700' },
  { key: 'fertilizer', to: PATHS.fertilizer, icon: FlaskConical, tone: 'bg-earth-100 text-earth-700' },
  { key: 'irrigation', to: PATHS.irrigation, icon: Droplets, tone: 'bg-info-soft text-info' },
]

export function QuickActions() {
  const { t } = useTranslation()
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">{t('dashboard.quickActions.title')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map(({ key, to, icon: Icon, tone }) => (
          <Link
            key={key}
            to={to}
            className="group flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/50"
          >
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-xs font-semibold text-ink">
              {t(`dashboard.quickActions.${key}`)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
