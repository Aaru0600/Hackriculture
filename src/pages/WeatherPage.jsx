import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { LocationPicker } from '@/components/LocationPicker'
import { CurrentConditions } from '@/components/weather/CurrentConditions'
import { ForecastStrip } from '@/components/weather/ForecastStrip'
import { FarmingAlerts } from '@/components/weather/FarmingAlerts'
import { SoilSnapshot } from '@/components/weather/SoilSnapshot'
import { getWeatherBundle } from '@/services/weatherService'
import { deriveFarmAlerts } from '@/lib/farmAlerts'
import { fadeUp } from '@/lib/motion'

const STORAGE_KEY = 'hk_location'

function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLocation(loc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  } catch {
    /* storage unavailable - not fatal */
  }
}

export default function WeatherPage() {
  const { t } = useTranslation()
  const [location, setLocation] = useState(loadSavedLocation)
  const [bundle, setBundle] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async (loc) => {
    setState('loading')
    try {
      const data = await getWeatherBundle(loc)
      setBundle(data)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    if (location) load(location)
  }, [location, load])

  const handleSelect = (loc) => {
    saveLocation(loc)
    setLocation(loc)
    setPickerOpen(false)
  }

  const placeLabel = location
    ? [location.name, location.admin1].filter(Boolean).join(', ')
    : ''

  return (
    <div>
      <div>
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('weather.title')}</h1>
          <p className="mt-1.5 max-w-2xl text-muted">{t('weather.subtitle')}</p>
        </motion.div>

        {/* No location yet */}
        {!location && (
          <Card className="mt-6">
            <p className="mb-4 text-sm font-medium text-ink">
              {t('weather.location.changeLocation')}
            </p>
            <LocationPicker onSelect={handleSelect} />
          </Card>
        )}

        {/* Location bar */}
        {location && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-[var(--shadow-card)]">
              <MapPin className="h-4 w-4 text-brand-600" />
              {placeLabel || t('weather.location.current')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => location && load(location)}
                disabled={state === 'loading'}
                iconLeft={
                  state === 'loading' ? (
                    <Spinner size={15} />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )
                }
              >
                {t('common.refresh')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen((v) => !v)}
              >
                {t('common.change')}
              </Button>
            </div>
          </div>
        )}

        {pickerOpen && (
          <Card className="mt-3">
            <LocationPicker onSelect={handleSelect} />
          </Card>
        )}

        {/* Error */}
        {state === 'error' && (
          <Card className="mt-6 border-danger/20 bg-danger-soft/40">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-danger" />
              <p className="flex-1 text-sm text-ink">{t('weather.error')}</p>
              <Button size="sm" onClick={() => location && load(location)}>
                {t('common.retry')}
              </Button>
            </div>
          </Card>
        )}

        {/* Loading skeleton */}
        {state === 'loading' && !bundle && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="h-72 animate-pulse rounded-2xl bg-black/5" />
            <div className="h-72 animate-pulse rounded-2xl bg-black/5" />
            <div className="h-40 animate-pulse rounded-2xl bg-black/5 lg:col-span-2" />
          </div>
        )}

        {/* Data */}
        {bundle && (state === 'ready' || state === 'loading') && (
          <motion.div
            key={`${bundle.location?.latitude}-${bundle.location?.longitude}`}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]"
          >
            <CurrentConditions bundle={bundle} />
            <FarmingAlerts alerts={deriveFarmAlerts(bundle)} />
            <div className="lg:col-span-2">
              <ForecastStrip daily={bundle.daily} />
            </div>
            <div className="lg:col-span-2">
              <SoilSnapshot location={location} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
