import { useTranslation } from 'react-i18next'
import { TrendingUp, Droplets, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const RISK_VARIANT = { low: 'success', moderate: 'warning', high: 'danger' }
const QUALITY_VARIANT = { high: 'success', medium: 'warning', low: 'danger' }
const NEED_VARIANT = { High: 'danger', Medium: 'warning', Low: 'success' }

function num(n, digits = 2) {
  return typeof n === 'number' ? n.toFixed(digits) : n ?? '--'
}

function Line({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

const qualityBucket = (score) => (score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low')

/** Renders a human-readable summary of one history row's output - never raw JSON. */
export function HistoryDetail({ isPred, kind, row }) {
  const { t } = useTranslation()
  const o = row.output ?? row

  if (isPred) {
    // Predictions are the one kind whose `output` is the ML service's raw
    // snake_case response (`predicted_yield_t_ha`, ...) - the camelCase shape
    // lives only in the ephemeral API response, never persisted. Recommendation
    // kinds below don't need this: their ML output is already camelCase.
    const predictedYield = o.predicted_yield_t_ha ?? row.predictedYield
    const yieldRange = o.yield_range_t_ha
    const expectedProduction = o.expected_production_t
    const predictionQuality = o.prediction_quality ?? row.predictionQuality ?? 0
    const qualityLabel = row.predictionQualityLabel || qualityBucket(predictionQuality)
    const riskLevel = o.risk_level ?? row.riskLevel
    const importantFactors = o.influencing_factors

    return (
      <div className="flex flex-col divide-y divide-line px-4 py-2">
        <Line label={t('predict.result.predictedYield')} value={`${num(predictedYield)} ${t('predict.result.tonsPerHa')}`} />
        {yieldRange && (
          <Line label={t('history.detail.range')} value={t('predict.result.range', { low: num(yieldRange[0]), high: num(yieldRange[1]) })} />
        )}
        {expectedProduction != null && (
          <Line label={t('history.detail.production')} value={t('predict.result.expectedProduction', { value: num(expectedProduction, 1) })} />
        )}
        <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
          <span className="text-muted">{t('predict.result.modelScore')}</span>
          <div className="flex items-center gap-2">
            <Badge variant={QUALITY_VARIANT[qualityLabel] || 'neutral'}>
              {t(`predict.result.quality.${qualityLabel}`)} · {Math.round(predictionQuality)}
            </Badge>
            {riskLevel && (
              <Badge variant={RISK_VARIANT[riskLevel] || 'neutral'} iconLeft={<AlertTriangle size={12} />}>
                {t(`predict.result.riskLevels.${riskLevel}`, riskLevel)}
              </Badge>
            )}
          </div>
        </div>
        {Array.isArray(importantFactors) && importantFactors.length > 0 && (
          <div className="py-2">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <TrendingUp size={13} /> {t('predict.result.whyTitle')}
            </span>
            <ul className="flex flex-col gap-1">
              {importantFactors.slice(0, 5).map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ink/80">{f.label}</span>
                  <span className={cn('font-semibold', (f.impact_t_ha ?? 0) >= 0 ? 'text-success' : 'text-danger')}>
                    {(f.impact_t_ha ?? 0) >= 0 ? '+' : ''}{num(f.impact_t_ha)} t/ha
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="pt-2 text-[11px] leading-relaxed text-muted">{o.prediction_quality_note}</p>
      </div>
    )
  }

  if (kind === 'crop') {
    return (
      <div className="flex flex-col gap-3 px-4 py-3">
        {(o.recommendations ?? []).map((r, i) => (
          <div key={r.crop} className="flex flex-col gap-1 rounded-lg bg-canvas p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold capitalize text-ink">{r.crop}</span>
              <Badge variant={i === 0 ? 'success' : 'neutral'}>{Math.round(r.suitabilityScore)}%</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {r.expectedYield && (
                <span className="flex items-center gap-1"><TrendingUp size={12} /> {r.expectedYield.low}-{r.expectedYield.high} t/ha</span>
              )}
              {r.waterRequirement && (
                <span className="flex items-center gap-1"><Droplets size={12} /> {t(`cropRec.waterLevels.${(r.waterRequirement || '').toLowerCase()}`, r.waterRequirement)}</span>
              )}
              {r.durationDays && (
                <span className="flex items-center gap-1"><Clock size={12} /> {r.durationDays.low}-{r.durationDays.high} {t('cropRec.days')}</span>
              )}
            </div>
          </div>
        ))}
        {o.alternatives?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted">{t('cropRec.alsoConsider')}:</span>
            {o.alternatives.map((a) => (
              <Badge key={a.crop} variant="neutral" className="capitalize">{a.crop} · {Math.round(a.suitabilityScore)}%</Badge>
            ))}
          </div>
        )}
        {o.disclaimer && <p className="text-[11px] leading-relaxed text-muted">{o.disclaimer}</p>}
      </div>
    )
  }

  if (kind === 'irrigation') {
    return (
      <div className="flex flex-col divide-y divide-line px-4 py-2">
        <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
          <span className="text-muted">{t('irrigation.result.need')}</span>
          <Badge variant={NEED_VARIANT[o.irrigationNeed] || 'neutral'}>
            {t(`irrigation.needLevels.${(o.irrigationNeed || '').toLowerCase()}`, o.irrigationNeed)}
          </Badge>
        </div>
        <Line label={t('irrigation.result.volume')} value={o.waterRequirement?.text} />
        <Line label={t('irrigation.result.nextIrrigation')} value={o.nextIrrigation} />
        <Line label={t('irrigation.result.duration')} value={o.duration} />
        {o.rainfallAdjustment && <p className="py-2 text-xs text-ink/80">{o.rainfallAdjustment}</p>}
        {o.disclaimer && <p className="pt-1 text-[11px] leading-relaxed text-muted">{o.disclaimer}</p>}
      </div>
    )
  }

  if (kind === 'fertilizer') {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted">{t('fertilizer.result.deficiencies')}:</span>
          {(o.deficiencies?.length ?? 0) === 0
            ? <Badge variant="success">{t('fertilizer.result.none')}</Badge>
            : o.deficiencies.map((d) => <Badge key={d} variant="warning" className="capitalize">{d}</Badge>)}
        </div>
        {(o.items?.length ?? 0) > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {o.items.map((it) => (
              <li key={it.nutrient} className="flex items-center justify-between">
                <span className="capitalize text-ink/80">{it.nutrient} ({it.deficitKgPerHa} kg/ha)</span>
                <span className="font-semibold text-ink">{it.fertilizer} · {it.quantityKgPerHa} kg/ha</span>
              </li>
            ))}
          </ul>
        )}
        <Line label={t('fertilizer.result.timing')} value={o.applicationTiming} />
        <Line label={t('fertilizer.result.method')} value={o.applicationMethod} />
        {o.soilAmendment && <p className="text-xs text-ink/80">{o.soilAmendment}</p>}
        {o.disclaimer && <p className="pt-1 text-[11px] leading-relaxed text-muted">{o.disclaimer}</p>}
      </div>
    )
  }

  return null
}
