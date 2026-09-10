import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Tractor, Plus, Pencil, Trash2, MapPin, Ruler, Layers, Droplets, Sprout,
  CalendarClock, Loader2, LocateFixed, X, Check,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { CropTimeline } from '@/components/farm/CropTimeline'
import {
  listFarms, createFarm, updateFarm, deleteFarm,
} from '@/services/farmService'
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/services/geoService'
import {
  IRRIGATION_TYPES, AREA_UNITS, FARM_SEASONS,
} from '@/data/farmOptions'
import { SOIL_TYPES, GROWTH_STAGES } from '@/data/predictionOptions'
import { cn } from '@/lib/cn'

const EMPTY_FORM = {
  farmName: '', area: '', areaUnit: 'acre', location: '',
  latitude: '', longitude: '', soilType: '', irrigationType: '',
  currentCrop: '', cropSeason: '', sownOn: '', growthStage: '', expectedHarvest: '',
}

const toFormValue = (f) => ({
  farmName: f.farmName ?? '',
  area: f.area ?? '',
  areaUnit: f.areaUnit ?? 'acre',
  location: f.location ?? '',
  latitude: f.latitude ?? '',
  longitude: f.longitude ?? '',
  soilType: f.soilType ?? '',
  irrigationType: f.irrigationType ?? '',
  currentCrop: f.currentCrop ?? '',
  cropSeason: f.cropSeason ?? '',
  sownOn: f.sownOn ? f.sownOn.slice(0, 10) : '',
  growthStage: f.growthStage ?? '',
  expectedHarvest: f.expectedHarvest ? f.expectedHarvest.slice(0, 10) : '',
})

function fmtDate(iso, lang) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export default function MyFarmPage() {
  const { t, i18n } = useTranslation()
  const geo = useGeolocation()

  const [status, setStatus] = useState('loading')
  const [farms, setFarms] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [mode, setMode] = useState('view')            // view | create | edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let alive = true
    listFarms()
      .then((data) => {
        if (!alive) return
        const items = data.items ?? []
        setFarms(items)
        setActiveId(items[0]?.id ?? null)
        setStatus('ready')
      })
      .catch((e) => alive && (setErr(e.message), setStatus('error')))
    return () => { alive = false }
  }, [])

  const active = farms.find((f) => f.id === activeId) ?? null
  const lang = i18n.resolvedLanguage

  const setField = (k) => (e) => {
    setForm((v) => ({ ...v, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const startCreate = () => {
    setForm(EMPTY_FORM); setErrors({}); setErr(null); setMode('create')
  }
  const startEdit = () => {
    setForm(toFormValue(active)); setErrors({}); setErr(null); setMode('edit')
  }
  const cancelForm = () => { setMode('view'); setErrors({}); setErr(null) }

  const useMyLocation = async () => {
    const coords = await geo.request()
    if (!coords) return
    setForm((v) => ({
      ...v, latitude: coords.latitude, longitude: coords.longitude,
    }))
    try {
      const place = await reverseGeocode(coords.latitude, coords.longitude, lang)
      const label = [place.name, place.admin1].filter(Boolean).join(', ')
      if (label) setForm((v) => ({ ...v, location: label }))
    } catch { /* keep the coordinates, skip the name */ }
  }

  const validate = () => {
    const es = {}
    if (!form.farmName.trim()) es.farmName = t('validation.required')
    const area = Number(form.area)
    if (form.area === '' || Number.isNaN(area)) es.area = t('validation.number')
    else if (area <= 0 || area > 100000) es.area = t('validation.range')
    if (form.sownOn && form.expectedHarvest && form.expectedHarvest < form.sownOn) {
      es.expectedHarvest = t('myFarm.form.harvestBeforeSowing')
    }
    setErrors(es)
    return Object.keys(es).length === 0
  }

  const buildPayload = () => {
    const p = {
      farmName: form.farmName.trim(),
      area: Number(form.area),
      areaUnit: form.areaUnit || 'acre',
    }
    // text fields: send even when blank on edit, so a cleared value persists
    for (const k of ['location', 'currentCrop']) {
      if (form[k] !== '' || mode === 'edit') p[k] = form[k].trim()
    }
    for (const k of ['soilType', 'irrigationType', 'cropSeason', 'growthStage']) {
      if (form[k]) p[k] = form[k]
    }
    for (const k of ['sownOn', 'expectedHarvest']) {
      if (form[k]) p[k] = form[k]
    }
    if (form.latitude !== '' && form.longitude !== '') {
      p.latitude = Number(form.latitude)
      p.longitude = Number(form.longitude)
    }
    return p
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true); setErr(null)
    try {
      if (mode === 'create') {
        const farm = await createFarm(buildPayload())
        setFarms((list) => [farm, ...list])
        setActiveId(farm.id)
      } else {
        const farm = await updateFarm(active.id, buildPayload())
        setFarms((list) => list.map((f) => (f.id === farm.id ? farm : f)))
      }
      setMode('view')
    } catch (e) {
      setErr(e.message || t('myFarm.form.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    setSaving(true); setErr(null)
    try {
      await deleteFarm(active.id)
      const rest = farms.filter((f) => f.id !== active.id)
      setFarms(rest)
      setActiveId(rest[0]?.id ?? null)
      setConfirmDelete(false)
      setMode('view')
    } catch (e) {
      setErr(e.message || t('myFarm.deleteFailed'))
    } finally {
      setSaving(false)
    }
  }

  /* ---------- render ---------- */

  const header = (
    <div className="mb-5 flex flex-col gap-1">
      <Badge variant="brand" className="w-fit">{t('myFarm.badge')}</Badge>
      <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('myFarm.title')}</h1>
      <p className="text-sm text-muted">{t('myFarm.subtitle')}</p>
    </div>
  )

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        {header}
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        {header}
        <Card className="text-sm text-danger">{err || t('myFarm.loadFailed')}</Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {header}

      {/* farm switcher */}
      {farms.length > 0 && mode === 'view' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {farms.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setActiveId(f.id); setConfirmDelete(false) }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                f.id === activeId
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-line bg-white text-muted hover:text-ink',
              )}
            >
              {f.farmName}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={startCreate} iconLeft={<Plus size={15} />}>
            {t('myFarm.addFarm')}
          </Button>
        </div>
      )}

      {/* empty state */}
      {farms.length === 0 && mode === 'view' && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <Tractor className="h-7 w-7" />
          </span>
          <p className="max-w-sm text-sm text-muted">{t('myFarm.emptyBody')}</p>
          <Button size="sm" onClick={startCreate} iconLeft={<Plus size={15} />}>
            {t('myFarm.addFirstFarm')}
          </Button>
        </Card>
      )}

      {/* view mode */}
      {mode === 'view' && active && (
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{active.farmName}</h2>
                <p className="text-xs text-muted">{t('myFarm.profile.title')}</p>
              </div>
              <Button size="sm" variant="outline" onClick={startEdit} iconLeft={<Pencil size={14} />}>
                {t('myFarm.edit')}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileItem icon={MapPin} label={t('myFarm.profile.location')}
                value={active.location || t('myFarm.notSet')} />
              <ProfileItem icon={Ruler} label={t('myFarm.profile.area')}
                value={`${active.area} ${t(`myFarm.units.${active.areaUnit}`, active.areaUnit)}`} />
              <ProfileItem icon={Layers} label={t('myFarm.profile.soilType')}
                value={active.soilType ? t(`soilType.${active.soilType}`, active.soilType) : t('myFarm.notSet')} />
              <ProfileItem icon={Droplets} label={t('myFarm.profile.irrigationType')}
                value={active.irrigationType ? t(`myFarm.irrigation.${active.irrigationType}`, active.irrigationType) : t('myFarm.notSet')} />
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              {t('myFarm.crop.title')}
            </p>
            {active.currentCrop ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileItem icon={Sprout} label={t('myFarm.crop.name')}
                  value={t(`predict.crops.${active.currentCrop}`, active.currentCrop)} />
                <ProfileItem icon={CalendarClock} label={t('myFarm.crop.sownOn')}
                  value={fmtDate(active.sownOn, lang) || t('myFarm.notSet')} />
                <ProfileItem icon={Sprout} label={t('myFarm.crop.growthStage')}
                  value={active.growthStage ? t(`predict.stages.${active.growthStage}`, active.growthStage) : t('myFarm.notSet')} />
                <ProfileItem icon={CalendarClock} label={t('myFarm.crop.expectedHarvest')}
                  value={fmtDate(active.expectedHarvest, lang) || t('myFarm.notSet')} />
              </div>
            ) : (
              <p className="text-sm text-muted">{t('myFarm.crop.none')}</p>
            )}
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-xs font-medium text-muted">{t('myFarm.timeline.title')}</p>
              <CropTimeline growthStage={active.growthStage} />
            </div>
          </Card>

          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}

          {confirmDelete ? (
            <Card className="flex flex-col gap-3 border-danger/30 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink">{t('myFarm.confirmDelete', { name: active.farmName })}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" variant="danger" onClick={doDelete} disabled={saving}
                  iconLeft={saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}>
                  {t('myFarm.delete')}
                </Button>
              </div>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-fit items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
            >
              <Trash2 size={14} /> {t('myFarm.deleteFarm')}
            </button>
          )}
        </div>
      )}

      {/* create / edit form */}
      {(mode === 'create' || mode === 'edit') && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">
              {mode === 'create' ? t('myFarm.form.createTitle') : t('myFarm.form.editTitle')}
            </h2>
            <button type="button" onClick={cancelForm} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <FormInput label={t('myFarm.form.farmName')} required
            value={form.farmName} onChange={setField('farmName')} error={errors.farmName} />

          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('myFarm.form.area')} type="number" step="0.01" required
              value={form.area} onChange={setField('area')} error={errors.area} />
            <SelectInput label={t('myFarm.form.areaUnit')} value={form.areaUnit} onChange={setField('areaUnit')}
              options={AREA_UNITS.map((u) => ({ value: u, label: t(`myFarm.units.${u}`, u) }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <FormInput label={t('myFarm.form.location')} value={form.location} onChange={setField('location')}
              hint={form.latitude !== '' ? t('myFarm.form.coordsSet', {
                lat: Number(form.latitude).toFixed(3), lon: Number(form.longitude).toFixed(3),
              }) : undefined} />
            <button type="button" onClick={useMyLocation}
              className="flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline">
              <LocateFixed size={13} />
              {geo.status === 'locating' ? t('myFarm.form.locating') : t('myFarm.form.useMyLocation')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectInput label={t('myFarm.form.soilType')} value={form.soilType} onChange={setField('soilType')}
              placeholder={t('predict.fields.optional')}
              options={SOIL_TYPES.map((s) => ({ value: s, label: t(`soilType.${s}`, s) }))} />
            <SelectInput label={t('myFarm.form.irrigationType')} value={form.irrigationType} onChange={setField('irrigationType')}
              placeholder={t('predict.fields.optional')}
              options={IRRIGATION_TYPES.map((s) => ({ value: s, label: t(`myFarm.irrigation.${s}`, s) }))} />
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              {t('myFarm.crop.title')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('myFarm.crop.name')} value={form.currentCrop} onChange={setField('currentCrop')}
                hint={t('predict.fields.optional')} />
              <SelectInput label={t('myFarm.crop.season')} value={form.cropSeason} onChange={setField('cropSeason')}
                placeholder={t('predict.fields.optional')}
                options={FARM_SEASONS.map((s) => ({ value: s, label: t(`predict.seasons.${s === 'whole_year' ? 'wholeYear' : s}`, s) }))} />
              <FormInput label={t('myFarm.crop.sownOn')} type="date" value={form.sownOn} onChange={setField('sownOn')} />
              <SelectInput label={t('myFarm.crop.growthStage')} value={form.growthStage} onChange={setField('growthStage')}
                placeholder={t('predict.fields.optional')}
                options={GROWTH_STAGES.map((s) => ({ value: s, label: t(`predict.stages.${s}`, s) }))} />
              <FormInput label={t('myFarm.crop.expectedHarvest')} type="date" value={form.expectedHarvest}
                onChange={setField('expectedHarvest')} error={errors.expectedHarvest} />
            </div>
          </div>

          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}
              iconLeft={saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}>
              {mode === 'create' ? t('myFarm.form.create') : t('myFarm.form.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ProfileItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-brand-600">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate text-sm font-bold capitalize text-ink">{value}</p>
      </div>
    </div>
  )
}
