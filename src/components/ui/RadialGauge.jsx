import { cn } from '@/lib/cn'

/**
 * Circular progress indicator (inline SVG, no chart lib). `value` 0-100.
 * Used for health scores and the yield-prediction confidence dial.
 */
export function RadialGauge({
  value = 0,
  size = 96,
  stroke = 9,
  trackClass = 'text-line',
  valueClass = 'text-brand-600',
  label,
  sublabel,
  className,
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={valueClass}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-lg font-extrabold text-ink">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && <span className="mt-0.5 text-[10px] font-medium text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}
