import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, Pencil, X, Check, Database } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormInput } from '@/components/ui/FormInput'
import { SelectInput } from '@/components/ui/SelectInput'
import {
  listDatasets, createDataset, updateDataset, deleteDataset,
} from '@/services/adminService'

const TASKS = ['yield', 'crop', 'irrigation', 'fertilizer', 'other']
const STATUSES = ['active', 'archived', 'draft']
const EMPTY = { name: '', task: 'other', rows: '', source: '', description: '', status: 'active' }

export default function AdminDatasetsPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)          // null | EMPTY (create) | {id,...} (edit)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => {
    setLoading(true)
    listDatasets().then((d) => setRows(d.items ?? [])).catch((e) => setErr(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setErr(t('validation.required')); return }
    setBusy(true); setErr(null)
    const body = {
      name: form.name.trim(), task: form.task, status: form.status,
      source: form.source.trim() || undefined,
      description: form.description.trim() || undefined,
      rows: form.rows === '' ? undefined : Number(form.rows),
    }
    try {
      if (form.id) {
        const upd = await updateDataset(form.id, body)
        setRows((list) => list.map((d) => (d.id === form.id ? { ...d, ...upd } : d)))
      } else {
        const row = await createDataset(body)
        setRows((list) => [row, ...list])
      }
      setForm(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await deleteDataset(id)
      setRows((list) => list.filter((d) => d.id !== id))
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('admin.datasets.title')}</h1>
          <p className="text-sm text-muted">{t('admin.datasets.subtitle')}</p>
        </div>
        {!form && (
          <Button size="sm" onClick={() => setForm({ ...EMPTY })} iconLeft={<Plus size={15} />}>
            {t('admin.datasets.add')}
          </Button>
        )}
      </div>

      {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}

      {form && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              {form.id ? t('admin.datasets.editTitle') : t('admin.datasets.addTitle')}
            </h2>
            <button type="button" onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={16} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label={t('admin.datasets.name')} required value={form.name} onChange={set('name')} />
            <SelectInput label={t('admin.datasets.task')} value={form.task} onChange={set('task')}
              options={TASKS.map((x) => ({ value: x, label: t(`admin.datasets.tasks.${x}`, x) }))} />
            <FormInput label={t('admin.datasets.rows')} type="number" value={form.rows} onChange={set('rows')} />
            <FormInput label={t('admin.datasets.source')} value={form.source} onChange={set('source')} />
            <SelectInput label={t('admin.datasets.status')} value={form.status} onChange={set('status')}
              options={STATUSES.map((x) => ({ value: x, label: t(`admin.datasets.statuses.${x}`, x) }))} />
            <FormInput label={t('admin.datasets.description')} value={form.description} onChange={set('description')} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}
              iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}>
              {form.id ? t('common.save', 'Save') : t('admin.datasets.add')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-muted">
          <Database size={26} /> <p className="text-sm">{t('admin.datasets.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-ink">{d.name}</p>
                  <Badge variant={d.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                    {t(`admin.datasets.statuses.${d.status}`, d.status)}
                  </Badge>
                  <Badge variant="brand" className="capitalize">{t(`admin.datasets.tasks.${d.task}`, d.task)}</Badge>
                  {d.synthetic && <Badge variant="warning">{t('admin.datasets.synthetic')}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">{d.description || '-'}</p>
                <p className="mt-1 text-xs text-muted">
                  {d.rows != null && t('admin.datasets.rowCount', { count: d.rows })}
                  {d.source && ` · ${d.source}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setForm({
                  id: d.id, name: d.name, task: d.task, rows: d.rows ?? '', source: d.source ?? '',
                  description: d.description ?? '', status: d.status,
                })}>
                  <Pencil size={13} />
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(d.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
