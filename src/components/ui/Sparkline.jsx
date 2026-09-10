import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Tiny trend line (inline SVG). Kept lib-free - Recharts is reserved for the
 * full analytics charts on the History page.
 */
export function Sparkline({ data = [], width = 120, height = 36, className, strokeClass = 'text-brand-500' }) {
  const gradId = useId()
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((d, i) => [i * stepX, height - ((d - min) / span) * (height - 4) - 2])
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} className={strokeClass} fill={`url(#${gradId})`} stroke="none" />
      <path d={line} className={strokeClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
