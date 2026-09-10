import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Bell, BellOff, Loader2, Check, CheckCheck, MapPin, ShieldCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ALERT_STYLES } from '@/lib/farmAlerts'
import {
  getAlerts, markRead, markAllRead, markAllUnread,
} from '@/services/alertsService'
import { PATHS } from '@/routes/paths'
import { cn } from '@/lib/cn'

export default function AlertsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('loading')
  const [alerts, setAlerts] = useState([])
  const [scopes, setScopes] = useState(0)
  const [filter, setFilter] = useState('all')       // all | unread

  useEffect(() => {
    let alive = true
    getAlerts()
      .then((res) => {
        if (!alive) return
        setAlerts(res.alerts)
        setScopes(res.scopes)
        setStatus('ready')
      })
      .catch(() => alive && setStatus('ready'))
    return () => { alive = false }
  }, [])

  const unread = useMemo(() => alerts.filter((a) => !a.read), [alerts])
  const shown = filter === 'unread' ? unread : alerts

  const setReadState = (id, read) => {
    if (read) markRead(id)
    else markAllUnread([id])
    setAlerts((list) => list.map((a) => (a.id === id ? { ...a, read } : a)))
  }

  const markEverythingRead = () => {
    markAllRead(alerts.map((a) => a.id))
    setAlerts((list) => list.map((a) => ({ ...a, read: true })))
  }

  const header = (
    <div className="mb-5 flex flex-col gap-1">
      <Badge variant="brand" className="w-fit">{t('alerts.badge')}</Badge>
      <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('alerts.title')}</h1>
      <p className="text-sm text-muted">{t('alerts.subtitle')}</p>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {header}

      {scopes === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <BellOff className="h-7 w-7" />
          </span>
          <p className="max-w-sm text-sm text-muted">{t('alerts.noLocation')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" to={PATHS.weather}>{t('alerts.setLocation')}</Button>
            <Button size="sm" variant="outline" to={PATHS.myFarm}>{t('alerts.addFarm')}</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl bg-black/5 p-1">
              {['all', 'unread'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                    filter === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {t(`alerts.filter.${k}`)}
                  {k === 'unread' && unread.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-xs text-white">
                      {unread.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={markEverythingRead}
              disabled={unread.length === 0}
              iconLeft={<CheckCheck size={15} />}
            >
              {t('alerts.markAllRead')}
            </Button>
          </div>

          {shown.length === 0 ? (
            <Card className="flex items-center gap-3 bg-success-soft py-8 text-sm text-success">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <p>{t('alerts.allCaughtUp')}</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((alert) => {
                const style = ALERT_STYLES[alert.severity] ?? ALERT_STYLES.info
                const Icon = alert.icon ?? Bell
                return (
                  <li
                    key={alert.id}
                    className={cn(
                      'relative overflow-hidden rounded-xl border border-line bg-white p-4 pl-5 transition-opacity',
                      alert.read && 'opacity-60',
                    )}
                  >
                    <span className={cn('absolute inset-y-0 left-0 w-1.5', style.bar)} />
                    <div className="flex items-start gap-3">
                      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', style.chip)}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-ink">{t(`${alert.i18nKey}.title`)}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">
                            <MapPin size={11} />
                            {alert.isSavedLocation
                              ? (alert.scopeLabel || t('alerts.savedLocation'))
                              : alert.scopeLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted">
                          {t(`${alert.i18nKey}.body`, alert.values)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReadState(alert.id, !alert.read)}
                        title={alert.read ? t('alerts.markUnread') : t('alerts.markRead')}
                        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-black/5 hover:text-ink"
                      >
                        {alert.read ? <BellOff size={15} /> : <Check size={15} />}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-5 text-xs leading-relaxed text-muted">
            {t('alerts.forecastNote')}{' '}
            <Link to={PATHS.weather} className="font-semibold text-brand-700 hover:underline">
              {t('alerts.openWeather')}
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
