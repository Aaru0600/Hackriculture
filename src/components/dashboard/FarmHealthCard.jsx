import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { RadialGauge } from '@/components/ui/RadialGauge'

const BAR_TONE = (v) =>
  v >= 80 ? 'bg-success' : v >= 60 ? 'bg-warning' : 'bg-danger'

/** Farm Health Score with a breakdown (spec section 23). */
export function FarmHealthCard({ health }) {
  const { t } = useTranslation()

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">{t('dashboard.health.title')}</h2>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <RadialGauge
          value={health.score}
          size={104}
          label={`${health.score}`}
          sublabel="/ 100"
          valueClass={health.score >= 75 ? 'text-brand-600' : 'text-warning'}
        />

        <ul className="w-full flex-1 space-y-3">
          {health.breakdown.map(({ key, value }) => (
            <li key={key}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">{t(`dashboard.health.${key}`)}</span>
                <span className="text-ink">{value}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${BAR_TONE(value)} transition-[width] duration-700`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
