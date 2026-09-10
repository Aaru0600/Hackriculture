import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { recommendFertilizer } from '@/services/fertilizerService'
import { YIELD_CROPS, SOIL_TYPES, GROWTH_STAGES } from '@/data/predictionOptions'

const NUM_FIELDS = {
  nitrogen: [0, 400, 'kg/ha'], phosphorus: [0, 200, 'kg/ha'],
  potassium: [0, 200, 'kg/ha'], soilPH: [3.5, 9.5, '3.5 - 9.5'],
}

export default function FertilizerPage() {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    crop: 'wheat', soilType: '', growthStage: 'sowing',
    nitrogen: '', phosphorus: '', potassium: '', soilPH: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const validate = () => {
    const es = {}
    for (const [f, [lo, hi]] of Object.entries(NUM_FIELDS)) {
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
    const payload = {
      crop: values.crop, growthStage: values.growthStage,
      nitrogen: Number(values.nitrogen), phosphorus: Number(values.phosphorus),
      potassium: Number(values.potassium), soilPH: Number(values.soilPH),
    }
    if (values.soilType) payload.soilType = values.soilType
    try {
      setResult(await recommendFertilizer(payload))
      setStatus('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErr(e.message || t('fertilizer.failed')); setStatus('error')
    }
  }

  const reset = () => { setResult(null); setStatus('idle') }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="brand" className="w-fit">{t('fertilizer.badge')}</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('fertilizer.title')}</h1>
        <p className="text-sm text-muted">{t('fertilizer.subtitle')}</p>
      </div>

      {status === 'done' && result ? (
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{t('fertilizer.result.deficiencies')}:</span>
              {result.deficiencies.length === 0 ? (
                <Badge variant="success">{t('fertilizer.result.none')}</Badge>
              ) : result.deficiencies.map((d) => (
                <Badge key={d} variant="warning" className="capitalize">{d}</Badge>
              ))}
            </div>
            <p className="text-sm text-ink/80">{result.explanation}</p>
          </Card>

          {result.items.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2">{t('fertilizer.result.nutrient')}</th>
                    <th className="pb-2">{t('fertilizer.result.deficit')}</th>
                    <th className="pb-2">{t('fertilizer.result.fertilizer')}</th>
                    <th className="pb-2">{t('fertilizer.result.quantity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((it) => (
                    <tr key={it.nutrient}>
                      <td className="py-2.5 capitalize text-ink">{it.nutrient}</td>
                      <td className="py-2.5 text-muted">{it.deficitKgPerHa} kg/ha</td>
                      <td className="py-2.5 text-ink">{it.fertilizer}</td>
                      <td className="py-2.5 font-semibold text-ink">{it.quantityKgPerHa} kg/ha</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">{t('fertilizer.result.timing')}</span>
              <p className="text-sm text-ink/80">{result.applicationTiming}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">{t('fertilizer.result.method')}</span>
              <p className="text-sm text-ink/80">{result.applicationMethod}</p>
            </Card>
          </div>

          {result.soilAmendment && (
            <Card className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-sm text-ink/80">{result.soilAmendment}</p>
            </Card>
          )}

          <p className="rounded-xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
            {result.disclaimer || t('fertilizer.disclaimer')}
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="w-fit">
            <RotateCcw size={15} /> {t('fertilizer.tryAnother')}
          </Button>
        </div>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SelectInput
              label={t('fertilizer.fields.crop')} required value={values.crop} onChange={set('crop')}
              options={YIELD_CROPS.map((c) => ({ value: c, label: t(`predict.crops.${c}`) }))}
            />
            <SelectInput
              label={t('fertilizer.fields.growthStage')} value={values.growthStage} onChange={set('growthStage')}
              options={GROWTH_STAGES.map((s) => ({ value: s, label: t(`predict.stages.${s}`, s) }))}
            />
            <SelectInput
              label={t('fertilizer.fields.soilType')} value={values.soilType} onChange={set('soilType')}
              placeholder={t('predict.fields.optional')}
              options={SOIL_TYPES.map((s) => ({ value: s, label: t(`soilType.${s}`, s) }))}
            />
            {Object.entries(NUM_FIELDS).map(([f, [, , hint]]) => (
              <FormInput
                key={f} label={t(`fertilizer.fields.${f}`)} type="number" step="0.1"
                value={values[f]} onChange={set(f)} error={errors[f]} hint={hint} required
              />
            ))}
          </div>
          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
          <Button size="sm" onClick={submit} disabled={status === 'loading'} className="w-fit">
            {status === 'loading'
              ? <><Loader2 size={16} className="animate-spin" /> {t('fertilizer.working')}</>
              : <><FlaskConical size={16} /> {t('fertilizer.submit')}</>}
          </Button>
        </Card>
      )}
    </div>
  )
}
