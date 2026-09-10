import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

export const Checkbox = forwardRef(function Checkbox(
  { label, error, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const boxId = id || autoId
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={boxId} className="flex items-start gap-2.5 text-sm text-ink">
        <input
          ref={ref}
          id={boxId}
          type="checkbox"
          className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-line text-brand-600 accent-brand-600"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  )
})
