import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Droplets, Thermometer, AlertTriangle, Download, RotateCcw,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PrintButton } from '@/components/ui/PrintButton'
import { RadialGauge } from '@/components/ui/RadialGauge'
import { cn } from '@/lib/cn'

const RISK_VARIANT = { low: 'success', moderate: 'warning', high: 'danger' }
const QUALITY_VALUE_CLASS = {
  high: 'text-success', medium: 'text-warning', low: 'text-danger',
}

function num(n, digits = 2) {
  return typeof n === 'number' ? n.toFixed(digits) : '--'
}

function MiniChart({ title, icon, data, xLabel, color }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 2, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              className="text-muted"
              label={{ value: xLabel, position: 'insideBottom', offset: -2, fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted" width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 12 }}
              formatter={(v) => [`${num(v)} t/ha`, 'yield']}
            />
            <Line
              type="monotone"
              dataKey="yield_t_ha"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function YieldResult({ result, input, onReset }) {
  const { t } = useTranslation()
  const r = result
  const qualityLabel = r.predictionQualityLabel || 'medium'
  const riskVariant = RISK_VARIANT[r.riskLevel] || 'neutral'

  const downloadReport = () => {
    const blob = new Blob(
      [JSON.stringify({ generatedAt: new Date().toISOString(), input, result: r }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yield-prediction-${r.id || Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="printable flex flex-col gap-5">
      {/* headline */}
      <Card className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            {t('predict.result.predictedYield')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-ink">{num(r.predictedYield)}</span>
            <span className="text-lg text-muted">{t('predict.result.tonsPerHa')}</span>
          </div>
          <p className="text-sm text-muted">
            {t('predict.result.range', { low: num(r.yieldRange?.[0]), high: num(r.yieldRange?.[1]) })}
          </p>
          {r.expectedProduction != null && (
            <p className="text-sm text-muted">
              {t('predict.result.expectedProduction', { value: num(r.expectedProduction, 1) })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <RadialGauge
            value={r.predictionQuality}
            size={116}
            valueClass={QUALITY_VALUE_CLASS[qualityLabel]}
            label={`${Math.round(r.predictionQuality)}`}
            sublabel={t('predict.result.modelScore')}
          />
          <div className="flex flex-col gap-2">
            <Badge variant={qualityLabel === 'high' ? 'success' : qualityLabel === 'low' ? 'danger' : 'warning'}>
              {t(`predict.result.quality.${qualityLabel}`)}
            </Badge>
            <Badge variant={riskVariant} iconLeft={<AlertTriangle size={13} />}>
              {t('predict.result.risk')}: {t(`predict.result.riskLevels.${r.riskLevel}`)}
            </Badge>
          </div>
        </div>
      </Card>

      {/* not-a-probability note */}
      <p className="rounded-xl bg-info-soft px-4 py-3 text-xs leading-relaxed text-info">
        {r.predictionQualityNote || t('predict.result.qualityNote')}
      </p>

      {/* influencing factors */}
      {Array.isArray(r.importantFactors) && r.importantFactors.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp size={16} />
            {t('predict.result.whyTitle')}
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {r.importantFactors.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">{f.label}</span>
                <span className="flex items-center gap-2 text-muted">
                  <span className="text-xs">{f.direction}</span>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      (f.impact_t_ha ?? 0) >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
                    )}
                  >
                    {(f.impact_t_ha ?? 0) >= 0 ? '+' : ''}{num(f.impact_t_ha)} t/ha
                  </span>
                  <span className="hidden text-[11px] uppercase tracking-wide text-muted sm:inline">
                    {f.source}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {r.adjustmentFactor != null && r.adjustmentFactor !== 1 && (
            <p className="text-xs text-muted">
              {t('predict.result.adjustmentNote', {
                factor: r.adjustmentFactor.toFixed(3),
                core: num(r.coreYield),
              })}
            </p>
          )}
        </Card>
      )}

      {/* charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {r.responseCurves?.rainfall && (
          <MiniChart
            title={t('predict.result.rainfallVsYield')}
            icon={<Droplets size={15} className="text-info" />}
            data={r.responseCurves.rainfall}
            xLabel={t('predict.result.rainfallMm')}
            color="var(--color-info)"
          />
        )}
        {r.responseCurves?.temperature && (
          <MiniChart
            title={t('predict.result.tempVsYield')}
            icon={<Thermometer size={15} className="text-harvest-600" />}
            data={r.responseCurves.temperature}
            xLabel={t('predict.result.tempC')}
            color="var(--color-harvest-500)"
          />
        )}
      </div>

      {/* disclaimer + actions */}
      <p className="rounded-xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
        {r.disclaimer || t('predict.result.disclaimer')}
      </p>

      <div className="no-print flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={15} /> {t('predict.result.newPrediction')}
        </Button>
        <Button variant="secondary" size="sm" onClick={downloadReport}>
          <Download size={15} /> {t('predict.result.downloadReport')}
        </Button>
        <PrintButton variant="secondary" />
      </div>
    </div>
  )
}
