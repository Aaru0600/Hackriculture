import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sprout, Loader2, Droplets, Clock, TrendingUp, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { RadialGauge } from '@/components/ui/RadialGauge'
import { recommendCrop } from '@/services/recommendationService'
import { SOIL_TYPES, YIELD_SEASONS } from '@/data/predictionOptions'
import { LocationAutofill } from '@/components/prediction/LocationAutofill'
import { cn } from '@/lib/cn'

const FIELDS = {
  nitrogen: [0, 200, 'kg/ha'], phosphorus: [0, 200, 'kg/ha'], potassium: [0, 220, 'kg/ha'],
  temperature: [5, 45, '°C'], humidity: [5, 100, '%'], soilPH: [3, 10, '3 - 10'],
  rainfall: [10, 320, 'mm / season'],
}

export default function CropRecommendationPage() {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    nitrogen: '', phosphorus: '', potassium: '', temperature: '',
    humidity: '', soilPH: '', rainfall: '', soilType: '', season: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const [autofilled, setAutofilled] = useState(0)

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const applyAutofill = (patch) => {
    setValues((v) => {
      const nv = { ...v }
      let n = 0
      for (const k of ['soilPH', 'nitrogen', 'temperature', 'humidity']) {
        if (patch[k] != null) { nv[k] = String(patch[k]); n++ }
      }
      if (patch.soilType) nv.soilType = patch.soilType
      if (patch.recentRainfall != null && !nv.rainfall) nv.rainfall = String(Math.min(320, patch.recentRainfall))
      setAutofilled(n)
      return nv
    })
    setErrors({})
  }

  const validate = () => {
    const es = {}
    for (const [f, [lo, hi]] of Object.entries(FIELDS)) {
      const raw = values[f]
      if (raw === '' || raw == null) { es[f] = t('validation.required'); continue }
      const n = Number(raw)
      if (Number.isNaN(n)) es[f] = t('validation.number')
      else if (n < lo || n > hi) es[f] = t('validation.range')
    }
    setErrors(es)
    return Object.keys(es).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setStatus('loading'); setErr(null)
    const payload = { ...Object.fromEntries(Object.keys(FIELDS).map((k) => [k, Number(values[k])])) }
    if (values.soilType) payload.soilType = values.soilType
    if (values.season) payload.season = values.season
    try {
      setResult(await recommendCrop(payload))
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErr(e.message || t('cropRec.failed')); setStatus('error')
    }
  }

  const reset = () => { setResult(null); setStatus('idle') }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="ai" className="w-fit">{t('common.poweredByAi')}</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('cropRec.title')}</h1>
        <p className="text-sm text-muted">{t('cropRec.subtitle')}</p>
      </div>

      {status === 'done' && result ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            {result.recommendations.map((r, i) => (
              <Card key={r.crop} className={cn('flex flex-col gap-3', i === 0 && 'ring-2 ring-brand-500')}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold capitalize text-ink">{r.crop}</span>
                  {i === 0 && <Badge variant="success">{t('cropRec.bestMatch')}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <RadialGauge value={r.suitabilityScore} size={72} label={`${Math.round(r.suitabilityScore)}%`} />
                  <div className="flex flex-col gap-1 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={13} />
                      {t('cropRec.expectedYield')}: {r.expectedYield?.low}-{r.expectedYield?.high} t/ha
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Droplets size={13} />
                      {t('cropRec.water')}: {t(`cropRec.waterLevels.${(r.waterRequirement || '').toLowerCase()}`, r.waterRequirement)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {r.durationDays?.low}-{r.durationDays?.high} {t('cropRec.days')}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-ink/80">{r.whyRecommended}</p>
                <p className="text-[11px] text-muted">{r.profitNote}</p>
              </Card>
            ))}
          </div>

          {result.alternatives?.length > 0 && (
            <Card className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{t('cropRec.alsoConsider')}:</span>
              {result.alternatives.map((a) => (
                <Badge key={a.crop} variant="neutral" className="capitalize">
                  {a.crop} · {Math.round(a.suitabilityScore)}%
                </Badge>
              ))}
            </Card>
          )}

          <p className="rounded-xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
            {result.disclaimer || t('cropRec.disclaimer')}
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="w-fit">
            <RotateCcw size={15} /> {t('cropRec.tryAnother')}
          </Button>
        </div>
      ) : (
        <Card className="flex flex-col gap-4">
          <LocationAutofill onFill={applyAutofill} />
          <p className="text-xs text-muted">
            {t('cropRec.formHint')}
            {autofilled > 0 && ` · ${t('autofill.filled', { count: autofilled })}`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(FIELDS).map(([f, [, , hint]]) => (
              <FormInput
                key={f} label={t(`cropRec.fields.${f}`)} type="number" step="0.1"
                value={values[f]} onChange={set(f)} error={errors[f]} hint={hint} required
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label={t('cropRec.fields.soilType')} value={values.soilType} onChange={set('soilType')}
              placeholder={t('predict.fields.optional')}
              options={SOIL_TYPES.map((s) => ({ value: s, label: t(`soilType.${s}`, s) }))}
            />
            <SelectInput
              label={t('cropRec.fields.season')} value={values.season} onChange={set('season')}
              placeholder={t('predict.fields.optional')}
              options={YIELD_SEASONS.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
            />
          </div>
          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
          <Button size="sm" onClick={submit} disabled={status === 'loading'} className="w-fit">
            {status === 'loading'
              ? <><Loader2 size={16} className="animate-spin" /> {t('cropRec.working')}</>
              : <><Sprout size={16} /> {t('cropRec.submit')}</>}
          </Button>
        </Card>
      )}
    </div>
  )
}
