import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, Sprout, TrendingUp, Lightbulb, Tractor, Bell, Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { getStats } from '@/services/adminService'

const CARDS = [
  { key: 'totalFarmers', icon: Users, tone: 'bg-brand-100 text-brand-700' },
  { key: 'activeUsers', icon: Sprout, tone: 'bg-earth-100 text-earth-700' },
  { key: 'predictionsMade', icon: TrendingUp, tone: 'bg-info-soft text-info' },
  { key: 'recommendationsGenerated', icon: Lightbulb, tone: 'bg-harvest-100 text-harvest-700' },
  { key: 'totalFarms', icon: Tractor, tone: 'bg-brand-100 text-brand-700' },
  { key: 'alerts', icon: Bell, tone: 'bg-warning-soft text-warning' },
]

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getStats().then((s) => alive && setStats(s)).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  if (loading) {
    return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('admin.overview.title')}</h1>
        <p className="text-sm text-muted">{t('admin.overview.subtitle')}</p>
      </div>

      {stats?.isMock && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{t('admin.mockNote')}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ key, icon: Icon, tone }) => (
          <Card key={key} className="flex items-center gap-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink">{stats?.[key] ?? 0}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t(`admin.stats.${key}`)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {stats?.recommendationsByKind && Object.keys(stats.recommendationsByKind).length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">{t('admin.overview.recsByKind')}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {Object.entries(stats.recommendationsByKind).map(([k, n]) => (
              <li key={k} className="rounded-full bg-black/5 px-3 py-1 capitalize text-ink">
                {k}: <span className="font-bold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
