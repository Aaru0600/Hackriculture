import { useTranslation } from 'react-i18next'
import { CloudRain, Droplets, Gauge, ThermometerSun, Wind } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { describeWeatherCode } from '@/lib/wmo'

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2.5">
      <Icon className="h-4.5 w-4.5 shrink-0 text-brand-600" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  )
}

export function CurrentConditions({ bundle }) {
  const { t, i18n } = useTranslation()
  const { current } = bundle
  const desc = describeWeatherCode(current.weatherCode)
  const Icon = desc.icon

  const updated = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(current.time))

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">
              {t('weather.metrics.condition')}
            </p>
            <p className="mt-1 text-2xl font-bold">{t(`wmo.${desc.i18nKey}`)}</p>
            <p className="mt-3 text-5xl font-extrabold tracking-tight">
              {current.temperature}&deg;C
            </p>
            <p className="mt-1 text-sm text-white/80">
              {t('weather.metrics.feelsLike')} {current.apparentTemperature}&deg;C
            </p>
          </div>
          <Icon className="h-16 w-16 shrink-0 text-white/90" strokeWidth={1.6} />
        </div>
        <p className="mt-4 text-xs text-white/70">
          {t('weather.updatedAt', { time: updated })} &middot;{' '}
          {t('weather.poweredBy', { provider: bundle.provider })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        <Metric
          icon={ThermometerSun}
          label={t('weather.metrics.feelsLike')}
          value={`${current.apparentTemperature}°C`}
        />
        <Metric
          icon={Droplets}
          label={t('weather.metrics.humidity')}
          value={`${current.humidity}%`}
        />
        <Metric
          icon={CloudRain}
          label={t('weather.metrics.rainChance')}
          value={`${current.rainProbability}%`}
        />
        <Metric
          icon={Wind}
          label={t('weather.metrics.wind')}
          value={`${current.windSpeed} km/h`}
        />
        <Metric
          icon={Gauge}
          label={t('weather.metrics.rainfall')}
          value={`${current.precipitation} mm`}
        />
      </div>
    </Card>
  )
}
