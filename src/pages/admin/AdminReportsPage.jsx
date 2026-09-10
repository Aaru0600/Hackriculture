import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, FileBarChart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PrintButton } from '@/components/ui/PrintButton'
import { cn } from '@/lib/cn'
import {
  getStats, listUsers, listPredictions, listRecommendations,
} from '@/services/adminService'

const REPORTS = ['summary', 'users', 'predictions', 'recommendations']

export default function AdminReportsPage() {
  const { t, i18n } = useTranslation()
  const [type, setType] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const fetcher = {
      summary: getStats,
      users: () => listUsers({ limit: 100 }),
      predictions: () => listPredictions({ limit: 100 }),
      recommendations: () => listRecommendations({ limit: 100 }),
    }[type]
    fetcher().then((d) => alive && setData(d)).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [type])

  const now = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'full', timeStyle: 'short' }).format(new Date())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('admin.reports.title')}</h1>
          <p className="text-sm text-muted">{t('admin.reports.subtitle')}</p>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-black/5 p-1">
        {REPORTS.map((r) => (
          <button key={r} type="button" onClick={() => setType(r)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
              type === r ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}>
            {t(`admin.reports.types.${r}`)}
          </button>
        ))}
      </div>

      <div className="printable">
        <Card className="flex flex-col gap-4">
          <header className="flex flex-col gap-1 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <FileBarChart size={18} className="text-brand-600" />
              <h2 className="text-lg font-bold text-ink">
                HACKRICULTURE — {t(`admin.reports.types.${type}`)}
              </h2>
            </div>
            <p className="text-xs text-muted">{t('admin.reports.generatedAt', { at: now })}</p>
            {data?.isMock && <Badge variant="warning" className="w-fit">{t('admin.mockNote')}</Badge>}
          </header>

          {loading ? (
            <div className="grid place-items-center py-12 text-muted"><Loader2 className="animate-spin" /></div>
          ) : type === 'summary' ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['totalFarmers', data?.totalFarmers],
                ['totalAdmins', data?.totalAdmins],
                ['totalFarms', data?.totalFarms],
                ['predictionsMade', data?.predictionsMade],
                ['recommendationsGenerated', data?.recommendationsGenerated],
                ['alerts', data?.alerts],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
                  <dt className="text-sm text-muted">{t(`admin.stats.${k}`)}</dt>
                  <dd className="text-lg font-bold text-ink">{v ?? 0}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ReportTable type={type} rows={data?.items ?? []} lang={i18n.resolvedLanguage} t={t} />
          )}

          <footer className="border-t border-line pt-3 text-xs text-muted">
            {t('admin.reports.footer')}
          </footer>
        </Card>
      </div>
    </div>
  )
}

function ReportTable({ type, rows, lang, t }) {
  const fmt = (iso) => {
    try { return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso)) }
    catch { return iso?.slice(0, 10) ?? '' }
  }
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">{t('admin.reports.empty')}</p>

  const cols = type === 'users'
    ? [['name', (r) => r.name], ['contact', (r) => r.email || r.phone || '-'], ['role', (r) => r.role], ['joined', (r) => fmt(r.createdAt)]]
    : type === 'predictions'
      ? [['user', (r) => r.user?.name || r.user || '-'], ['crop', (r) => r.input?.crop || '-'], ['result', (r) => (r.predictedYield != null ? `${r.predictedYield} t/ha` : '-')], ['when', (r) => fmt(r.createdAt)]]
      : [['user', (r) => r.user?.name || r.user || '-'], ['kind', (r) => r.kind], ['summary', (r) => r.summary || '-'], ['when', (r) => fmt(r.createdAt)]]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>{cols.map(([k]) => <th key={k} className="p-2">{t(`admin.reports.col.${k}`, k)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {cols.map(([k, get]) => <td key={k} className="p-2 capitalize text-ink/90">{get(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
