import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PATHS } from '@/routes/paths'

/** Wordmark + sprout glyph. Links home unless `as="span"`. */
export function Logo({ className, showText = true, tone = 'default', as = 'link' }) {
  const text = tone === 'invert' ? 'text-white' : 'text-ink'
  const mark =
    tone === 'invert'
      ? 'bg-white/15 text-white ring-1 ring-white/25'
      : 'bg-brand-600 text-white'

  const inner = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid h-9 w-9 place-items-center rounded-xl shadow-sm',
          mark,
        )}
      >
        <Sprout className="h-5 w-5" strokeWidth={2.4} />
      </span>
      {showText && (
        <span className={cn('font-display text-lg font-extrabold tracking-tight', text)}>
          HACKRICULTURE
        </span>
      )}
    </span>
  )

  if (as === 'span') return inner
  return (
    <Link to={PATHS.home} className="rounded-xl" aria-label="HACKRICULTURE home">
      {inner}
    </Link>
  )
}
