import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { useAuth } from '@/context/AuthContext'
import { listUsers, updateUserRole, deleteUser } from '@/services/adminService'
import { cn } from '@/lib/cn'

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [err, setErr] = useState(null)

  const load = (query = '') => {
    setLoading(true)
    listUsers({ q: query, limit: 50 })
      .then((d) => { setRows(d.items ?? []); setTotal(d.total ?? 0) })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSearch = (e) => {
    e.preventDefault()
    load(q.trim())
  }

  const toggleRole = async (u) => {
    setBusyId(u.id); setErr(null)
    try {
      const next = u.role === 'admin' ? 'farmer' : 'admin'
      const updated = await updateUserRole(u.id, next)
      setRows((list) => list.map((r) => (r.id === u.id ? { ...r, role: updated.role ?? next } : r)))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id) => {
    setBusyId(id); setErr(null)
    try {
      await deleteUser(id)
      setRows((list) => list.filter((r) => r.id !== id))
      setTotal((n) => n - 1)
      setConfirmId(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const fmt = (iso) => {
    try {
      return new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(iso))
    } catch { return iso?.slice(0, 10) ?? '' }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('admin.users.title')}</h1>
          <p className="text-sm text-muted">{t('admin.users.count', { count: total })}</p>
        </div>
        <form onSubmit={onSearch} className="flex items-end gap-2">
          <FormInput label={t('admin.users.search')} value={q} onChange={(e) => setQ(e.target.value)}
            className="w-56" icon={<Search size={15} />} />
          <Button size="sm" type="submit">{t('common.search')}</Button>
        </form>
      </div>

      {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">{t('admin.users.name')}</th>
                <th className="p-3">{t('admin.users.contact')}</th>
                <th className="p-3">{t('admin.users.location')}</th>
                <th className="p-3">{t('admin.users.role')}</th>
                <th className="p-3">{t('admin.users.joined')}</th>
                <th className="p-3 text-right">{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => {
                const isSelf = u.id === me?.id
                return (
                  <tr key={u.id}>
                    <td className="p-3 font-semibold text-ink">{u.name}</td>
                    <td className="p-3 text-muted">{u.email || u.phone || '-'}</td>
                    <td className="p-3 text-muted">{[u.district, u.state].filter(Boolean).join(', ') || '-'}</td>
                    <td className="p-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                        u.role === 'admin' ? 'bg-brand-100 text-brand-800' : 'bg-black/5 text-ink/70',
                      )}>
                        {u.role === 'admin' && <ShieldCheck size={11} />}{u.role}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{fmt(u.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" disabled={isSelf || busyId === u.id}
                          onClick={() => toggleRole(u)}>
                          <UserIcon size={13} />
                          {u.role === 'admin' ? t('admin.users.makeFarmer') : t('admin.users.makeAdmin')}
                        </Button>
                        {confirmId === u.id ? (
                          <Button size="sm" variant="danger" disabled={busyId === u.id}
                            onClick={() => remove(u.id)}>
                            {t('admin.users.confirmDelete')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={isSelf}
                            onClick={() => setConfirmId(u.id)}>
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted">{t('admin.users.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
