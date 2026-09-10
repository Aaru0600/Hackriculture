import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Droplets, HeartPulse, Sprout, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboard } from '@/services/dashboardService'
import { getWeatherBundle } from '@/services/weatherService'
import { deriveFarmAlerts } from '@/lib/farmAlerts'
import { fadeUp, stagger } from '@/lib/motion'
import { FarmSummary } from '@/components/dashboard/FarmSummary'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { AiInsight } from '@/components/dashboard/AiInsight'
import { FarmHealthCard } from '@/components/dashboard/FarmHealthCard'
import { TodayWeatherCard } from '@/components/dashboard/TodayWeatherCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { FarmingAlerts } from '@/components/weather/FarmingAlerts'

function greetingKey(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function loadSavedLocation() {
  try {
    return JSON.parse(localStorage.getItem('hk_location') || 'null')
  } catch {
    return null
  }
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  const location = useMemo(() => loadSavedLocation(), [])

  useEffect(() => {
    let active = true
    getDashboard(user)
      .then((d) => active && setData(d))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!location) {
      setWeatherLoading(false)
      return
    }
    let active = true
    getWeatherBundle(location)
      .then((b) => active && setWeather(b))
      .catch(() => {})
      .finally(() => active && setWeatherLoading(false))
    return () => {
      active = false
    }
  }, [location])

  const alerts = weather ? deriveFarmAlerts(weather) : []
  const firstName = user?.name?.split(' ')[0] || t('dashboard.greeting.farmer')
  const placeName = location
    ? [location.name, location.admin1].filter(Boolean).join(', ')
    : ''

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    )
  }

  const { farmSummary, kpis, farmHealth } = data

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t(`dashboard.greeting.${greetingKey()}`, { name: firstName })} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-muted">{t('dashboard.greeting.sub')}</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <AiInsight topAlert={alerts[0]} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <FarmSummary summary={farmSummary} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label={t('dashboard.kpi.expectedYield')}
          value={kpis.expectedYield.value}
          unit={kpis.expectedYield.unit}
          delta={kpis.expectedYield.delta}
          series={kpis.expectedYield.series}
          tone="brand"
        />
        <KpiCard
          icon={Sprout}
          label={t('dashboard.kpi.soilHealth')}
          value={kpis.soilHealth.value}
          unit={kpis.soilHealth.unit}
          delta={kpis.soilHealth.delta}
          series={kpis.soilHealth.series}
          tone="earth"
        />
        <KpiCard
          icon={Droplets}
          label={t('dashboard.kpi.waterRequirement')}
          value={kpis.waterRequirement.value}
          unit={kpis.waterRequirement.unit}
          delta={kpis.waterRequirement.delta}
          series={kpis.waterRequirement.series}
          tone="info"
          deltaGood="down"
        />
        <KpiCard
          icon={HeartPulse}
          label={t('dashboard.kpi.cropHealth')}
          value={kpis.cropHealth.value}
          unit={kpis.cropHealth.unit}
          delta={kpis.cropHealth.delta}
          series={kpis.cropHealth.series}
          tone="harvest"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <TodayWeatherCard bundle={weather} loading={weatherLoading} placeName={placeName} />
        <FarmHealthCard health={farmHealth} />
      </motion.div>

      {alerts.length > 0 && (
        <motion.div variants={fadeUp}>
          <FarmingAlerts alerts={alerts} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <QuickActions />
      </motion.div>
    </motion.div>
  )
}
