import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Labelled native select. `options` is [{ value, label }]. Native on purpose -
 * works well on mobile and with the platform's language input.
 */
export const SelectInput = forwardRef(function SelectInput(
  { label, error, hint, options = [], placeholder, className, id, required, ...props },
  ref,
) {
  const autoId = useId()
  const selectId = id || autoId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-white px-3.5 pr-10 text-sm text-ink outline-none transition-colors',
            error ? 'border-danger' : 'border-line focus:border-brand-500',
            !props.value && placeholder && 'text-muted/80',
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
})
