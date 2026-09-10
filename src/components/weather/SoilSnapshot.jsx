import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Info, Layers, Sprout } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { getSoilEstimate } from '@/services/soilService'

function Row({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
      <Icon className="h-4.5 w-4.5 shrink-0 text-earth-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="text-sm font-bold text-ink">
          {value}
          {sub && <span className="ml-1 font-medium text-muted">{sub}</span>}
        </p>
      </div>
    </div>
  )
}

/**
 * Estimated soil properties for the selected point - so the farmer doesn't
 * type pH or soil type into forms. Values come from a global soil map; a
 * local soil test still wins.
 */
export function SoilSnapshot({ location }) {
  const { t } = useTranslation()
  const [soil, setSoil] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!location) return
    let cancelled = false
    setLoading(true)
    getSoilEstimate(location)
      .then((data) => !cancelled && setSoil(data))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [location])

  const nLevel = soil?.nitrogenLevelKey
  const nLevelLabel =
    nLevel && nLevel !== 'unknown'
      ? { low: '●○○', medium: '●●○', high: '●●●' }[nLevel]
      : '—'

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{t('fieldData.fields.soilType')}</h2>
        {loading && <Spinner size={15} className="text-brand-600" />}
      </div>

      {soil && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row
              icon={FlaskConical}
              label={t('fieldData.fields.soilPH')}
              value={soil.soilPH ?? '—'}
            />
            <Row
              icon={Layers}
              label={t('fieldData.fields.soilType')}
              value={t(`soilType.${soil.soilTypeKey}`)}
            />
            <Row
              icon={Sprout}
              label={t('fieldData.fields.organicCarbon')}
              value={soil.organicCarbon != null ? `${soil.organicCarbon}%` : '—'}
            />
            <Row
              icon={Sprout}
              label={t('fieldData.fields.nitrogen')}
              value={nLevelLabel}
              sub={soil.totalNitrogen != null ? `${soil.totalNitrogen} g/kg` : ''}
            />
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-harvest-50 p-3 text-xs text-earth-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-harvest-600" />
            <span>
              {t('fieldData.soilNote')} &middot; {soil.provider}
            </span>
          </p>
        </>
      )}
    </Card>
  )
}
