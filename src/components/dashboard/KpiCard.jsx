import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Sparkline } from '@/components/ui/Sparkline'

const TONES = {
  brand: { icon: 'bg-brand-100 text-brand-700', spark: 'text-brand-500' },
  earth: { icon: 'bg-earth-100 text-earth-700', spark: 'text-earth-500' },
  info: { icon: 'bg-info-soft text-info', spark: 'text-info' },
  harvest: { icon: 'bg-harvest-100 text-harvest-700', spark: 'text-harvest-500' },
}

/**
 * Dashboard KPI tile: label, big value + unit, delta chip, and a sparkline.
 * `deltaGood` flips the colour when "down" is the desired direction (e.g. water need).
 */
export function KpiCard({ icon: Icon, label, value, unit, delta, series, tone = 'brand', deltaGood = 'up' }) {
  const t = TONES[tone] ?? TONES.brand
  const positive = delta > 0
  const isGood = (deltaGood === 'up' && positive) || (deltaGood === 'down' && !positive) || delta === 0
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <span className={cn('grid h-10 w-10 place-items-center rounded-xl', t.icon)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta != null && delta !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
              isGood ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {Math.abs(delta)}
            {unit === '%' ? 'pp' : ''}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-ink">
          {value ?? '—'}
          {value != null && <span className="ml-1 text-sm font-bold text-muted">{unit}</span>}
        </p>
      </div>

      {series?.length > 1 && (
        <Sparkline data={series} strokeClass={t.spark} className="mt-auto w-full" width={160} height={34} />
      )}
    </Card>
  )
}
