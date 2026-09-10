import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  History as HistoryIcon, Loader2, TrendingUp, Sprout, Droplets, FlaskConical, ChevronDown,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getYieldHistory, getRecommendationsHistory } from '@/services/historyService'
import { cn } from '@/lib/cn'

const KIND_ICON = { crop: Sprout, irrigation: Droplets, fertilizer: FlaskConical }

function fmtDate(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso?.slice(0, 10) ?? ''
  }
}

export default function HistoryPage() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('predictions')
  const [status, setStatus] = useState('loading')
  const [predictions, setPredictions] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    Promise.allSettled([getYieldHistory(), getRecommendationsHistory()])
      .then(([p, r]) => {
        if (!alive) return
        setPredictions(p.status === 'fulfilled' ? (p.value.items ?? []) : [])
        setRecommendations(r.status === 'fulfilled' ? (r.value.items ?? []) : [])
        setStatus('done')
      })
    return () => { alive = false }
  }, [])

  const yieldTrend = useMemo(
    () =>
      [...predictions]
        .filter((p) => p.predictedYield != null)
        .reverse()
        .map((p, i) => ({ x: i + 1, yield: p.predictedYield, date: fmtDate(p.createdAt, i18n.resolvedLanguage) })),
    [predictions, i18n.resolvedLanguage],
  )

  const rows = tab === 'predictions' ? predictions : recommendations

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <Badge variant="brand" className="w-fit">{t('history.badge')}</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('history.title')}</h1>
        <p className="text-sm text-muted">{t('history.subtitle')}</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-black/5 p-1">
        {['predictions', 'recommendations'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              tab === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {t(`history.tabs.${k}`)}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="grid place-items-center py-16 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {status === 'done' && tab === 'predictions' && yieldTrend.length >= 2 && (
        <Card className="mb-4 flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp size={15} /> {t('history.yieldTrend')}
          </span>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldTrend} margin={{ top: 5, right: 8, bottom: 2, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted" stroke="currentColor" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted" stroke="currentColor" width={40} />
                <Tooltip formatter={(v) => [`${v} t/ha`, 'yield']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="yield" stroke="var(--color-brand-600)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {status === 'done' && rows.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <HistoryIcon size={28} className="text-muted" />
          <p className="text-sm text-muted">{t('history.empty')}</p>
        </Card>
      )}

      {status === 'done' && rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const isPred = tab === 'predictions'
            const Icon = isPred ? TrendingUp : (KIND_ICON[row.kind] || Sprout)
            const title = isPred
              ? t('history.rows.yieldFor', { crop: row.input?.crop ?? '-' })
              : t(`history.rows.${row.kind}`, row.kind)
            const summary = isPred
              ? `${row.predictedYield ?? '-'} t/ha · ${row.riskLevel ?? ''}`
              : row.summary ?? ''
            return (
              <Card key={row.id} className="!p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon size={16} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold capitalize text-ink">{title}</span>
                    <span className="block text-xs text-muted">{summary}</span>
                  </span>
                  <span className="text-xs text-muted">{fmtDate(row.createdAt, i18n.resolvedLanguage)}</span>
                  <ChevronDown
                    size={16}
                    className={cn('text-muted transition-transform', openId === row.id && 'rotate-180')}
                  />
                </button>
                {openId === row.id && (
                  <pre className="max-h-72 overflow-auto border-t border-line bg-canvas p-3 text-[11px] leading-relaxed text-ink/80">
                    {JSON.stringify(row.output ?? row, null, 2)}
                  </pre>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
