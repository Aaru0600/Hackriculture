import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

/**
 * "AI Insight of the Day" banner (spec section 23). When a weather-derived
 * alert exists it surfaces that; otherwise it shows a general tip that rotates
 * by day so the demo isn't static.
 */
export function AiInsight({ topAlert }) {
  const { t } = useTranslation()

  const tips = t('dashboard.insight.tips', { returnObjects: true })
  const tipList = Array.isArray(tips) ? tips : []
  // Rotate the tip once per day; computed once on mount.
  const [daySeed] = useState(() => Math.floor(Date.now() / 86_400_000))
  const dayIndex = daySeed % Math.max(tipList.length, 1)

  const body = topAlert
    ? t(`${topAlert.i18nKey}.body`, topAlert.values)
    : tipList[dayIndex] || ''

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-harvest-400/25 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
            {t('dashboard.insight.title')}
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-white">{body}</p>
        </div>
      </div>
    </div>
  )
}
