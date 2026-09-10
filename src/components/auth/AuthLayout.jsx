import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { LanguageSelector } from '@/components/LanguageSelector'
import { FarmScene } from '@/components/landing/FarmScene'

/**
 * Two-pane auth shell: a nature-themed brand panel (hidden on small screens)
 * and the form card. Used by login / register / forgot-password.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useTranslation()
  const points = t('auth.brandPoints', { returnObjects: true })

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-rows opacity-20" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-harvest-400/25 blur-3xl" />
        <div className="relative">
          <Logo tone="invert" />
        </div>
        <div className="relative">
          <div className="max-w-sm rounded-3xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
            <FarmScene className="h-auto w-full rounded-2xl" />
          </div>
          <h2 className="mt-8 max-w-sm text-2xl font-bold text-white">
            {t('auth.brandHeading')}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {(Array.isArray(points) ? points : []).map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-harvest-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">{t('footer.disclaimer')}</p>
      </aside>

      {/* Form pane */}
      <main className="flex flex-col bg-canvas">
        <header className="flex items-center justify-between px-5 py-4 lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <LanguageSelector />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-8 lg:px-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
