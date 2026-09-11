import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Droplets, Loader2, CalendarClock, Timer, CloudRain, Info, RotateCcw,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { recommendIrrigation } from '@/services/recommendationService'
import { YIELD_CROPS, SOIL_TYPES, GROWTH_STAGES } from '@/data/predictionOptions'
import { LocationAutofill } from '@/components/prediction/LocationAutofill'

const IRRIGATION_TYPES = ['canal', 'drip', 'rainfed', 'sprinkler']
const NUM_FIELDS = {
  soilMoisture: [0, 100, '%'], temperature: [5, 50, '°C'], humidity: [5, 100, '%'],
  rainfall: [0, 3000, 'recent mm'], forecastRainProbability: [0, 100, '%'],
  farmSize: [0.01, 100000, 'ha'],
}
const NEED_VARIANT = { High: 'danger', Medium: 'warning', Low: 'success' }

export default function IrrigationPage() {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    crop: 'wheat', soilType: '', growthStage: '', irrigationType: '',
    soilMoisture: '', temperature: '', humidity: '', rainfall: '',
    forecastRainProbability: '', farmSize: '',
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
      for (const k of ['temperature', 'humidity']) {
        if (patch[k] != null) { nv[k] = String(patch[k]); n++ }
      }
      if (patch.soilType) { nv.soilType = patch.soilType; n++ }
      setAutofilled(n)
      return nv
    })
    setErrors({})
  }

  const validate = () => {
    const es = {}
    if (!values.crop) es.crop = t('validation.required')
    for (const [f, [lo, hi]] of Object.entries(NUM_FIELDS)) {
      const raw = values[f]
      if (raw === '' || raw == null) continue
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
    const payload = { crop: values.crop }
    for (const k of Object.keys(NUM_FIELDS)) {
      if (values[k] !== '' && values[k] != null) payload[k] = Number(values[k])
    }
    for (const k of ['soilType', 'growthStage', 'irrigationType']) {
      if (values[k]) payload[k] = values[k]
    }
    try {
      setResult(await recommendIrrigation(payload))
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErr(e.message || t('irrigation.failed')); setStatus('error')
    }
  }

  const reset = () => { setResult(null); setStatus('idle') }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="ai" className="w-fit">{t('common.poweredByAi')}</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('irrigation.title')}</h1>
        <p className="text-sm text-muted">{t('irrigation.subtitle')}</p>
      </div>

      {status === 'done' && result ? (
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                {t('irrigation.result.need')}
              </span>
              <div className="flex items-center gap-3">
                <Badge variant={NEED_VARIANT[result.irrigationNeed] || 'neutral'}>
                  {t(`irrigation.needLevels.${result.irrigationNeed?.toLowerCase()}`, result.irrigationNeed)}
                </Badge>
                <span className="text-sm text-muted">
                  {t('irrigation.result.modelScore', { value: result.needConfidence })}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/80">{result.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-ink">
                {result.waterRequirement?.grossDepthMm}<span className="ml-1 text-lg text-muted">mm</span>
              </div>
              <p className="text-xs text-muted">{result.waterRequirement?.text}</p>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <CalendarClock size={14} /> {t('irrigation.result.nextIrrigation')}
              </span>
              <span className="text-lg font-semibold text-ink">{result.nextIrrigation}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Timer size={14} /> {t('irrigation.result.duration')}
              </span>
              <span className="text-sm font-medium text-ink">{result.duration}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Droplets size={14} /> {t('irrigation.result.volume')}
              </span>
              <span className="text-sm font-medium text-ink">
                {result.waterRequirement?.totalVolumeM3} m³
                <span className="ml-1 text-xs text-muted">
                  ({result.waterRequirement?.netDepthMm} mm net)
                </span>
              </span>
            </Card>
          </div>

          <Card className="flex items-start gap-2">
            <CloudRain size={16} className="mt-0.5 shrink-0 text-info" />
            <p className="text-sm text-ink/80">{result.rainfallAdjustment}</p>
          </Card>

          {result.assumptions?.length > 0 && (
            <Card className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Info size={13} /> {t('irrigation.result.assumptions')}
              </span>
              <ul className="list-disc pl-5 text-xs text-muted">
                {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Card>
          )}

          <p className="rounded-xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
            {result.disclaimer || t('irrigation.disclaimer')}
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="w-fit">
            <RotateCcw size={15} /> {t('irrigation.tryAnother')}
          </Button>
        </div>
      ) : (
        <Card className="flex flex-col gap-4">
          <LocationAutofill onFill={applyAutofill} />
          {autofilled > 0 && (
            <p className="text-xs text-muted">{t('autofill.filled', { count: autofilled })}</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SelectInput
              label={t('irrigation.fields.crop')} required value={values.crop} onChange={set('crop')}
              error={errors.crop}
              options={YIELD_CROPS.map((c) => ({ value: c, label: t(`predict.crops.${c}`) }))}
            />
            <SelectInput
              label={t('irrigation.fields.soilType')} value={values.soilType} onChange={set('soilType')}
              placeholder={t('predict.fields.optional')}
              options={SOIL_TYPES.map((s) => ({ value: s, label: t(`soilType.${s}`, s) }))}
            />
            <SelectInput
              label={t('irrigation.fields.growthStage')} value={values.growthStage} onChange={set('growthStage')}
              placeholder={t('predict.fields.optional')}
              options={GROWTH_STAGES.map((s) => ({ value: s, label: t(`predict.stages.${s}`, s) }))}
            />
            <SelectInput
              label={t('irrigation.fields.irrigationType')} value={values.irrigationType} onChange={set('irrigationType')}
              placeholder={t('predict.fields.optional')}
              options={IRRIGATION_TYPES.map((s) => ({ value: s, label: t(`irrigation.methods.${s}`, s) }))}
            />
            {Object.entries(NUM_FIELDS).map(([f, [, , hint]]) => (
              <FormInput
                key={f} label={t(`irrigation.fields.${f}`)} type="number" step="0.1"
                value={values[f]} onChange={set(f)} error={errors[f]} hint={hint}
              />
            ))}
          </div>
          <p className="text-xs text-muted">{t('irrigation.formHint')}</p>
          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
          <Button size="sm" onClick={submit} disabled={status === 'loading'} className="w-fit">
            {status === 'loading'
              ? <><Loader2 size={16} className="animate-spin" /> {t('irrigation.working')}</>
              : <><Droplets size={16} /> {t('irrigation.submit')}</>}
          </Button>
        </Card>
      )}
    </div>
  )
}
