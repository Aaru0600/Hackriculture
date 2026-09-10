import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Loader2, Check, TriangleAlert } from 'lucide-react'
import { LocationPicker } from '@/components/LocationPicker'
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/services/geoService'
import { getSoilEstimate } from '@/services/soilService'
import { getWeatherBundle, getAnnualRainfall } from '@/services/weatherService'
import { cn } from '@/lib/cn'

const SOIL_KEY_MAP = {
  clay: 'clayey', clayLoam: 'clayey', silt: 'silty', siltLoam: 'silty',
  sandy: 'sandy', sandyLoam: 'sandy', loam: 'loamy',
}
const N_LEVEL_KG = { low: 30, medium: 60, high: 90 }

/**
 * "Auto-fill from my location" - pulls soil (SoilGrids) and weather (Open-Meteo)
 * for a point the farmer picks or their GPS, and hands a field patch to the
 * parent. Values are model estimates, NOT a soil-lab test - the caller shows
 * that, and every field stays editable.
 *
 * @param {(patch: object, meta: {place?:string,state?:string,district?:string}) => void} onFill
 */
export function LocationAutofill({ onFill }) {
  const { t } = useTranslation()
  const geo = useGeolocation()
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [note, setNote] = useState('')

  async function run(loc) {
    setStatus('loading')
    setNote('')
    try {
      const [soil, weather, rain, place] = await Promise.allSettled([
        getSoilEstimate(loc),
        getWeatherBundle(loc),
        getAnnualRainfall(loc),
        reverseGeocode(loc.latitude, loc.longitude),
      ])

      const patch = {}
      const meta = {}

      if (soil.status === 'fulfilled') {
        const s = soil.value
        if (s.soilPH != null) patch.soilPH = s.soilPH
        const st = SOIL_KEY_MAP[s.soilTypeKey]
        if (st) patch.soilType = st
        if (s.nitrogenLevelKey && N_LEVEL_KG[s.nitrogenLevelKey]) {
          patch.nitrogen = N_LEVEL_KG[s.nitrogenLevelKey]
        }
        if (s.isMock) setNote(t('autofill.soilMock'))
      }

      if (weather.status === 'fulfilled') {
        const w = weather.value
        if (w.current?.temperature != null) patch.temperature = w.current.temperature
        if (w.current?.humidity != null) patch.humidity = w.current.humidity
      }

      // annual rainfall (Open-Meteo archive, trailing 365 days) for the yield form
      if (rain.status === 'fulfilled' && rain.value?.annualRainfallMm > 0) {
        patch.rainfall = rain.value.annualRainfallMm
        if (rain.value.isMock) setNote((n) => n || t('autofill.rainfallMock'))
      }

      const rev = place.status === 'fulfilled' ? place.value : null
      meta.place = loc.name || rev?.name || ''
      meta.state = loc.admin1 || rev?.admin1 || ''
      meta.district = rev?.name || ''

      onFill(patch, meta)
      setStatus('done')
    } catch {
      setStatus('error')
      setNote(t('autofill.failed'))
    }
  }

  async function useGps() {
    const coords = await geo.request()
    if (coords) run({ latitude: coords.latitude, longitude: coords.longitude })
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
        <MapPin size={15} />
        {t('autofill.title')}
      </div>
      <p className="mt-0.5 text-xs text-muted">{t('autofill.subtitle')}</p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <LocationPicker compact onSelect={(loc) => run(loc)} />
        </div>
        <button
          type="button"
          onClick={useGps}
          disabled={status === 'loading' || geo.status === 'loading'}
          className="h-11 shrink-0 rounded-xl border border-brand-600/30 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          {status === 'loading' || geo.status === 'loading'
            ? <Loader2 size={15} className="inline animate-spin" />
            : t('common.useMyLocation')}
        </button>
      </div>

      {status === 'done' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
          <Check size={13} /> {t('autofill.done')}
        </p>
      )}
      {note && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert size={13} /> {note}
        </p>
      )}
      <p className={cn('mt-2 text-[11px] leading-tight text-muted')}>{t('autofill.disclaimer')}</p>
    </div>
  )
}
