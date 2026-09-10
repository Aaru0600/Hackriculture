import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ALERT_STYLES } from '@/lib/farmAlerts'

export function FarmingAlerts({ alerts }) {
  const { t } = useTranslation()

  return (
    <Card>
      <h2 className="text-base font-bold">{t('weather.alerts.heading')}</h2>

      {alerts.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-success-soft p-4 text-sm text-success">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{t('weather.alerts.none')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert) => {
            const style = ALERT_STYLES[alert.severity]
            const Icon = alert.icon
            return (
              <li
                key={alert.id}
                className="relative overflow-hidden rounded-xl border border-line bg-white p-4 pl-5"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`} />
                <div className="flex items-start gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.chip}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {t(`${alert.i18nKey}.title`)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {t(`${alert.i18nKey}.body`, alert.values)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
