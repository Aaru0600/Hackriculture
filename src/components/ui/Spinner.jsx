import { cn } from '@/lib/cn'

/** Minimal spinner. Size in px via `size`. */
export function Spinner({ size = 18, className }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={{ width: size, height: size }}
    />
  )
}
