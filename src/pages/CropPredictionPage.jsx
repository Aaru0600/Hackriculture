import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sprout, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { predictYield } from '@/services/predictionService'
import {
  YIELD_CROPS, YIELD_SEASONS, YIELD_STATES, SOIL_TYPES, GROWTH_STAGES, MONTHS,
} from '@/data/predictionOptions'
import { YieldResult } from '@/components/prediction/YieldResult'
import { LocationAutofill } from '@/components/prediction/LocationAutofill'
import { cn } from '@/lib/cn'

const STEPS = ['farm', 'soil', 'environment', 'crop']

const NUMERIC_FIELDS = {
  farmSize: [0.01, 100000], nitrogen: [0, 400], phosphorus: [0, 200],
  potassium: [0, 200], soilPH: [3.5, 9.5], temperature: [5, 45],
  humidity: [10, 100], rainfall: [0, 7000], previousYield: [0, 200],
}

function readStoredState() {
  try {
    const loc = JSON.parse(localStorage.getItem('hk_location') || 'null')
    return loc?.admin1 || ''
  } catch {
    return ''
  }
}

export default function CropPredictionPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [step, setStep] = useState(0)
  const [values, setValues] = useState(() => ({
    crop: 'wheat',
    state: YIELD_STATES.includes(readStoredState()) ? readStoredState() : '',
    district: '',
    season: 'rabi',
    farmSize: user?.farmSizeUnit === 'hectare' ? String(user?.farmSize ?? '') : '',
    soilType: '',
    nitrogen: '', phosphorus: '', potassium: '', soilPH: '',
    temperature: '', humidity: '', rainfall: '',
    sowMonth: '', growthStage: '', previousYield: '',
  }))
  const [autofilled, setAutofilled] = useState([])

  const applyAutofill = (patch, meta) => {
    setValues((v) => {
      const nv = { ...v }
      const touched = []
      for (const k of ['soilPH', 'soilType', 'nitrogen', 'temperature', 'humidity', 'rainfall']) {
        if (patch[k] != null) { nv[k] = String(patch[k]); touched.push(k) }
      }
      if (!nv.district && meta?.district) nv.district = meta.district
      if ((!nv.state || !YIELD_STATES.includes(nv.state)) && meta?.state) {
        const match = YIELD_STATES.find((s) => s.toLowerCase() === String(meta.state).toLowerCase())
        if (match) nv.state = match
      }
      setAutofilled(touched)
      return nv
    })
    setErrors({})
  }
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const validateStep = (i) => {
    const errs = {}
    if (i === 0) {
      if (!values.crop) errs.crop = t('validation.required')
      if (!values.state) errs.state = t('validation.required')
      if (!values.season) errs.season = t('validation.required')
      if (!values.farmSize) errs.farmSize = t('validation.required')
    }
    // numeric range check for any field that was filled
    for (const [field, [lo, hi]] of Object.entries(NUMERIC_FIELDS)) {
      const raw = values[field]
      if (raw === '' || raw == null) continue
      const n = Number(raw)
      if (Number.isNaN(n)) errs[field] = t('validation.number')
      else if (n < lo || n > hi) errs[field] = t('validation.range')
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const payload = useMemo(() => {
    const p = { crop: values.crop, state: values.state, season: values.season }
    if (values.district) p.district = values.district
    const numeric = {
      farmSize: 'farmSize', nitrogen: 'nitrogen', phosphorus: 'phosphorus',
      potassium: 'potassium', soilPH: 'soilPH', temperature: 'temperature',
      humidity: 'humidity', rainfall: 'rainfall', previousYield: 'previousYield',
    }
    for (const [k, key] of Object.entries(numeric)) {
      if (values[k] !== '' && values[k] != null) p[key] = Number(values[k])
    }
    if (values.soilType) p.soilType = values.soilType
    if (values.growthStage) p.growthStage = values.growthStage
    if (values.sowMonth) p.sowMonth = MONTHS.indexOf(values.sowMonth) + 1
    return p
  }, [values])

  const submit = async () => {
    if (!validateStep(step)) return
    setStatus('loading')
    setSubmitError(null)
    try {
      const data = await predictYield(payload)
      setResult(data)
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err.message || t('predict.form.failed'))
      setStatus('error')
    }
  }

  const reset = () => {
    setResult(null)
    setStatus('idle')
    setStep(0)
  }

  if (status === 'done' && result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Header />
        <YieldResult result={result} input={payload} onReset={reset} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Header />

      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((key, i) => (
          <li key={key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                i < step && 'bg-brand-600 text-white',
                i === step && 'bg-brand-100 text-brand-800 ring-2 ring-brand-600',
                i > step && 'bg-black/5 text-muted',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('hidden text-xs font-medium sm:inline', i === step ? 'text-ink' : 'text-muted')}>
              {t(`predict.steps.${key}`)}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <Card className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <SelectInput
              label={t('predict.fields.crop')} required
              value={values.crop} onChange={set('crop')} error={errors.crop}
              options={YIELD_CROPS.map((c) => ({ value: c, label: t(`predict.crops.${c}`) }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                label={t('predict.fields.state')} required placeholder={t('predict.fields.selectState')}
                value={values.state} onChange={set('state')} error={errors.state}
                options={YIELD_STATES.map((s) => ({ value: s, label: s }))}
              />
              <FormInput
                label={t('predict.fields.district')}
                value={values.district} onChange={set('district')}
                hint={t('predict.fields.optional')}
              />
            </div>
            <SelectInput
              label={t('predict.fields.season')} required
              value={values.season} onChange={set('season')} error={errors.season}
              options={YIELD_SEASONS.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
            />
            <FormInput
              label={t('predict.fields.farmSize')} required type="number" inputMode="decimal"
              value={values.farmSize} onChange={set('farmSize')} error={errors.farmSize}
              hint={t('predict.fields.farmSizeHint')}
            />
          </>
        )}

        {step === 1 && (
          <>
            <LocationAutofill onFill={applyAutofill} />
            <p className="text-xs text-muted">
              {t('predict.optionalHint')}
              {autofilled.length > 0 && ` · ${t('autofill.filled', { count: autofilled.length })}`}
            </p>
            <SelectInput
              label={t('predict.fields.soilType')}
              value={values.soilType} onChange={set('soilType')}
              placeholder={t('predict.fields.optional')}
              options={SOIL_TYPES.map((s) => ({ value: s, label: t(`soilType.${s}`, s) }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('predict.fields.nitrogen')} type="number" value={values.nitrogen} onChange={set('nitrogen')} error={errors.nitrogen} hint="kg/ha" />
              <FormInput label={t('predict.fields.phosphorus')} type="number" value={values.phosphorus} onChange={set('phosphorus')} error={errors.phosphorus} hint="kg/ha" />
              <FormInput label={t('predict.fields.potassium')} type="number" value={values.potassium} onChange={set('potassium')} error={errors.potassium} hint="kg/ha" />
              <FormInput label={t('predict.fields.soilPH')} type="number" step="0.1" value={values.soilPH} onChange={set('soilPH')} error={errors.soilPH} hint="3.5 - 9.5" />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <LocationAutofill onFill={applyAutofill} />
            <p className="text-xs text-muted">
              {t('predict.envHint')}
              {autofilled.length > 0 && ` · ${t('autofill.filled', { count: autofilled.length })}`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('predict.fields.temperature')} type="number" value={values.temperature} onChange={set('temperature')} error={errors.temperature} hint="°C" />
              <FormInput label={t('predict.fields.humidity')} type="number" value={values.humidity} onChange={set('humidity')} error={errors.humidity} hint="%" />
            </div>
            <FormInput
              label={t('predict.fields.rainfall')} type="number"
              value={values.rainfall} onChange={set('rainfall')} error={errors.rainfall}
              hint={t('predict.fields.rainfallHint')}
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-xs text-muted">{t('predict.optionalHint')}</p>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                label={t('predict.fields.sowMonth')}
                value={values.sowMonth} onChange={set('sowMonth')}
                placeholder={t('predict.fields.optional')}
                options={MONTHS.map((m) => ({ value: m, label: t(`predict.months.${m.toLowerCase()}`, m) }))}
              />
              <SelectInput
                label={t('predict.fields.growthStage')}
                value={values.growthStage} onChange={set('growthStage')}
                placeholder={t('predict.fields.optional')}
                options={GROWTH_STAGES.map((s) => ({ value: s, label: t(`predict.stages.${s}`, s) }))}
              />
            </div>
            <FormInput
              label={t('predict.fields.previousYield')} type="number" step="0.1"
              value={values.previousYield} onChange={set('previousYield')} error={errors.previousYield}
              hint={t('predict.fields.previousYieldHint')}
            />
          </>
        )}

        {submitError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{submitError}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>
            <ChevronLeft size={16} /> {t('predict.form.back')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={next}>
              {t('predict.form.next')} <ChevronRight size={16} />
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={status === 'loading'}>
              {status === 'loading' ? (
                <><Loader2 size={16} className="animate-spin" /> {t('predict.form.predicting')}</>
              ) : (
                <><Sprout size={16} /> {t('predict.form.predict')}</>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function Header() {
  const { t } = useTranslation()
  return (
    <div className="mb-5 flex flex-col gap-1">
      <Badge variant="ai" className="w-fit">{t('common.poweredByAi')}</Badge>
      <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('predict.title')}</h1>
      <p className="text-sm text-muted">{t('predict.subtitle')}</p>
    </div>
  )
}
