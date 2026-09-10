import { cn } from '@/lib/cn'

const VARIANTS = {
  neutral: 'bg-black/5 text-ink/70',
  brand: 'bg-brand-100 text-brand-800',
  earth: 'bg-earth-100 text-earth-800',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  ai: 'bg-gradient-to-r from-brand-600 to-harvest-500 text-white shadow-sm',
}

/** Small status / label pill. `variant="ai"` is the gradient AI badge. */
export function Badge({ variant = 'neutral', className, iconLeft, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        VARIANTS[variant],
        className,
      )}
    >
      {iconLeft}
      {children}
    </span>
  )
}
