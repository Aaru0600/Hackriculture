import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Boxes, Check, Wifi, WifiOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SelectInput } from '@/components/ui/SelectInput'
import { FormInput } from '@/components/ui/FormInput'
import { listModels, updateModel } from '@/services/adminService'

const STATUSES = ['production', 'staging', 'deprecated', 'retraining']
const STATUS_VARIANT = { production: 'success', staging: 'info', retraining: 'warning', deprecated: 'neutral' }

export default function AdminModelsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [reachable, setReachable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(null)      // { key, status, notes }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let alive = true
    listModels()
      .then((d) => { if (!alive) return; setItems(d.items ?? []); setReachable(!!d.mlServiceReachable) })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      await updateModel(edit.key, { status: edit.status, notes: edit.notes })
      setItems((list) => list.map((m) => (m.key === edit.key ? { ...m, status: edit.status, notes: edit.notes } : m)))
      setEdit(null)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (loading) {
    return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('admin.models.title')}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {reachable
            ? <><Wifi size={14} className="text-success" /> {t('admin.models.live')}</>
            : <><WifiOff size={14} className="text-warning" /> {t('admin.models.offline')}</>}
        </p>
      </div>

      {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}

      <div className="grid gap-4">
        {items.map((m) => (
          <Card key={m.key} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-bold text-ink">
                  <Boxes size={16} className="text-brand-600" /> {m.name}
                  <Badge variant={STATUS_VARIANT[m.status] || 'neutral'} className="capitalize">
                    {t(`admin.models.statuses.${m.status}`, m.status)}
                  </Badge>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t('admin.models.version')}: <span className="font-mono">{m.version || '-'}</span>
                  {m.algorithm && ` · ${m.algorithm}`}
                  {m.trainedAt && ` · ${t('admin.models.trainedAt')} ${String(m.trainedAt).slice(0, 10)}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEdit({ key: m.key, status: m.status, notes: m.notes || '' })}>
                {t('admin.models.editStatus')}
              </Button>
            </div>

            {m.metrics && (
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(m.metrics).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-black/5 px-2.5 py-1 text-ink">
                    {k}: <span className="font-bold">{typeof v === 'number' ? v : String(v)}</span>
                  </span>
                ))}
              </div>
            )}
            {m.notes && <p className="text-sm text-ink/80">{m.notes}</p>}
            {!m.liveInfoAvailable && (
              <p className="text-xs text-muted">{t('admin.models.noLiveInfo')}</p>
            )}

            {edit?.key === m.key && (
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-3">
                <SelectInput label={t('admin.models.status')} value={edit.status}
                  onChange={(e) => setEdit((x) => ({ ...x, status: e.target.value }))}
                  options={STATUSES.map((s) => ({ value: s, label: t(`admin.models.statuses.${s}`, s) }))} />
                <FormInput label={t('admin.models.notes')} value={edit.notes}
                  onChange={(e) => setEdit((x) => ({ ...x, notes: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={busy}
                    iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}>
                    {t('common.save', 'Save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted">{t('admin.models.retrainNote')}</p>
    </div>
  )
}
