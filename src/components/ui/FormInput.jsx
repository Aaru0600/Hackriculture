import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Labelled text input with error + hint slots. `error` is a pre-translated
 * string (callers resolve i18n before passing it in).
 */
export const FormInput = forwardRef(function FormInput(
  { label, error, hint, icon, className, id, required, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70',
            icon && 'pl-10',
            error
              ? 'border-danger focus:border-danger'
              : 'border-line focus:border-brand-500',
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
})
