import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LANGUAGES } from '@/i18n'
import { useClickOutside } from '@/hooks/useClickOutside'

/**
 * Language switcher used in the navbar and later in Settings.
 * `tone="invert"` for placement on dark backgrounds.
 */
export function LanguageSelector({ tone = 'default', align = 'right' }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false), open)

  const current =
    LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  const select = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
          tone === 'invert'
            ? 'text-white/90 hover:bg-white/10'
            : 'text-ink/80 hover:bg-black/5',
        )}
      >
        <Languages className="h-4 w-4" />
        <span>{current.native}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {LANGUAGES.map((lang) => {
            const active = lang.code === current.code
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(lang.code)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-ink/80 hover:bg-black/5',
                  )}
                >
                  <span>
                    {lang.native}
                    <span className="ml-1.5 text-xs text-muted">{lang.label}</span>
                  </span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
