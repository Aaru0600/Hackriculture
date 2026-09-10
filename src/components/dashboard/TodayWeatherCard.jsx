import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CloudRain, Droplets, MapPin, Wind } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { describeWeatherCode } from '@/lib/wmo'
import { PATHS } from '@/routes/paths'

/** Compact today's-weather card for the dashboard. Full detail on /weather. */
export function TodayWeatherCard({ bundle, loading, placeName }) {
  const { t } = useTranslation()

  if (loading && !bundle) {
    return (
      <Card className="grid h-full min-h-40 place-items-center p-5">
        <Spinner size={22} className="text-brand-600" />
      </Card>
    )
  }

  if (!bundle) {
    return (
      <Card className="flex h-full flex-col items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-bold text-ink">{t('dashboard.weather.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('dashboard.weather.noLocation')}</p>
        </div>
        <Link
          to={PATHS.weather}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          {t('dashboard.weather.setLocation')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    )
  }

  const { current } = bundle
  const desc = describeWeatherCode(current.weatherCode)
  const Icon = desc.icon

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{t('dashboard.weather.title')}</h2>
        {placeName && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3" />
            {placeName}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Icon className="h-12 w-12 text-brand-600" strokeWidth={1.7} />
        <div>
          <p className="text-3xl font-extrabold text-ink">{current.temperature}&deg;C</p>
          <p className="text-sm text-muted">{t(`wmo.${desc.i18nKey}`)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-canvas py-2">
          <Droplets className="mx-auto h-4 w-4 text-info" />
          <p className="mt-1 text-xs font-bold text-ink">{current.humidity}%</p>
          <p className="text-[10px] text-muted">{t('weather.metrics.humidity')}</p>
        </div>
        <div className="rounded-lg bg-canvas py-2">
          <CloudRain className="mx-auto h-4 w-4 text-info" />
          <p className="mt-1 text-xs font-bold text-ink">{current.rainProbability}%</p>
          <p className="text-[10px] text-muted">{t('weather.metrics.rainChance')}</p>
        </div>
        <div className="rounded-lg bg-canvas py-2">
          <Wind className="mx-auto h-4 w-4 text-muted" />
          <p className="mt-1 text-xs font-bold text-ink">{current.windSpeed}</p>
          <p className="text-[10px] text-muted">km/h</p>
        </div>
      </div>

      <Link
        to={PATHS.weather}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        {t('dashboard.weather.viewFull')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  )
}
