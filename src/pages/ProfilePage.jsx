import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User, Loader2, Check, KeyRound, ShieldCheck, Sparkles,
} from 'lucide-react'
import i18n from '@/i18n'
import { LANGUAGES } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import { useAuth } from '@/context/AuthContext'
import { changePassword } from '@/services/authService'
import { INDIA_STATES, FARM_SIZE_UNITS } from '@/data/indiaStates'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    state: user?.state ?? '',
    district: user?.district ?? '',
    preferredLanguage: user?.preferredLanguage ?? i18n.resolvedLanguage ?? 'en',
    farmSize: user?.farmSize ?? '',
    farmSizeUnit: user?.farmSizeUnit ?? 'acre',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwErr, setPwErr] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const set = (k) => (e) => {
    setForm((v) => ({ ...v, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
    setSaved(false)
  }
  const setPwField = (k) => (e) => {
    setPw((v) => ({ ...v, [k]: e.target.value }))
    setPwErr(null); setPwSaved(false)
  }

  const saveProfile = async () => {
    const es = {}
    if (!form.name.trim() || form.name.trim().length < 2) es.name = t('validation.required')
    if (form.farmSize !== '' && (Number.isNaN(Number(form.farmSize)) || Number(form.farmSize) <= 0)) {
      es.farmSize = t('validation.number')
    }
    setErrors(es)
    if (Object.keys(es).length) return

    setSaving(true); setErr(null)
    try {
      const patch = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        state: form.state,
        district: form.district.trim(),
        preferredLanguage: form.preferredLanguage,
        farmSize: form.farmSize === '' ? null : Number(form.farmSize),
        farmSizeUnit: form.farmSizeUnit,
      }
      await updateUser(patch)
      if (form.preferredLanguage !== i18n.resolvedLanguage) {
        i18n.changeLanguage(form.preferredLanguage)
      }
      setSaved(true)
    } catch (e) {
      setErr(e.message || t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (pw.newPassword.length < 8) return setPwErr(t('validation.minLength'))
    if (pw.newPassword !== pw.confirm) return setPwErr(t('validation.passwordMatch'))
    setPwSaving(true); setPwErr(null)
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      setPwSaved(true)
    } catch (e) {
      setPwErr(e.message || t('profile.password.failed'))
    } finally {
      setPwSaving(false)
    }
  }

  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="brand" className="w-fit">{t('profile.badge')}</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('profile.title')}</h1>
        <p className="text-sm text-muted">{t('profile.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* account summary */}
        <Card className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <User className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">{user?.name}</p>
            <p className="truncate text-sm text-muted">{user?.email || user?.phone}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 font-semibold capitalize">
                <ShieldCheck size={11} /> {user?.role || 'farmer'}
              </span>
              {memberSince && <span>{t('profile.memberSince', { date: memberSince })}</span>}
            </div>
          </div>
        </Card>

        {/* editable details */}
        <Card className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink">{t('profile.details')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label={t('profile.fields.name')} required value={form.name}
              onChange={set('name')} error={errors.name} />
            <FormInput label={t('profile.fields.phone')} value={form.phone} onChange={set('phone')}
              hint={t('predict.fields.optional')} />
            <FormInput label={t('profile.fields.email')} value={user?.email || ''} disabled
              hint={t('profile.emailLocked')} />
            <SelectInput label={t('profile.fields.state')} value={form.state} onChange={set('state')}
              placeholder={t('auth.fields.statePlaceholder')}
              options={INDIA_STATES.map((s) => ({ value: s, label: s }))} />
            <FormInput label={t('profile.fields.district')} value={form.district} onChange={set('district')} />
            <SelectInput label={t('profile.fields.language')} value={form.preferredLanguage}
              onChange={set('preferredLanguage')}
              options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.label} (${l.native})` }))} />
            <FormInput label={t('profile.fields.farmSize')} type="number" step="0.1"
              value={form.farmSize} onChange={set('farmSize')} error={errors.farmSize} />
            <SelectInput label={t('profile.fields.farmSizeUnit')} value={form.farmSizeUnit}
              onChange={set('farmSizeUnit')}
              options={FARM_SIZE_UNITS.map((u) => ({ value: u.value, label: t(u.labelKey, u.value) }))} />
          </div>
          {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveProfile} disabled={saving}
              iconLeft={saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}>
              {t('profile.save')}
            </Button>
            {saved && <span className="text-sm font-medium text-success">{t('profile.saved')}</span>}
          </div>
        </Card>

        {/* password */}
        <Card className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <KeyRound size={16} /> {t('profile.password.title')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormInput label={t('profile.password.current')} type="password"
              value={pw.currentPassword} onChange={setPwField('currentPassword')} />
            <FormInput label={t('profile.password.new')} type="password"
              value={pw.newPassword} onChange={setPwField('newPassword')} />
            <FormInput label={t('profile.password.confirm')} type="password"
              value={pw.confirm} onChange={setPwField('confirm')} />
          </div>
          {pwErr && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{pwErr}</p>}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={savePassword}
              disabled={pwSaving || !pw.currentPassword || !pw.newPassword}
              iconLeft={pwSaving ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}>
              {t('profile.password.submit')}
            </Button>
            {pwSaved && <span className="text-sm font-medium text-success">{t('profile.password.done')}</span>}
          </div>
        </Card>

        {/* plan */}
        <Card className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Sparkles size={16} className="text-harvest-500" /> {t('profile.plan.title')}
          </h2>
          <p className="text-sm text-muted">{t('profile.plan.body')}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="brand">{t('profile.plan.free')}</Badge>
            <Button size="sm" variant="ghost" disabled>{t('profile.plan.upgradeSoon')}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
