import { useTranslation } from 'react-i18next'
import { Droplets } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { describeWeatherCode } from '@/lib/wmo'

export function ForecastStrip({ daily }) {
  const { t, i18n } = useTranslation()
  const dayFmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short' })

  return (
    <Card>
      <h2 className="text-base font-bold">{t('weather.forecast.heading')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {daily.map((day, i) => {
          const desc = describeWeatherCode(day.weatherCode)
          const Icon = desc.icon
          const label =
            i === 0 ? t('common.today') : dayFmt.format(new Date(day.date))
          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-canvas px-2 py-3 text-center"
            >
              <span className="text-xs font-semibold text-muted">{label}</span>
              <Icon className="h-7 w-7 text-brand-600" strokeWidth={1.8} />
              <span className="text-sm font-bold text-ink">
                {day.tempMax}&deg;
                <span className="font-medium text-muted"> / {day.tempMin}&deg;</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-info">
                <Droplets className="h-3 w-3" />
                {day.precipitationProbability}%
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
