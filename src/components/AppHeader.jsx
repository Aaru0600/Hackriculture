import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { LanguageSelector } from '@/components/LanguageSelector'
import { PATHS } from '@/routes/paths'

/**
 * Lightweight top bar for standalone feature pages. Replaced by the full
 * dashboard layout (top nav + sidebar + mobile bottom nav) in a later phase.
 */
export function AppHeader({ backTo = PATHS.home }) {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-black/5"
            aria-label={t('common.backToHome')}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <Logo />
        </div>
        <LanguageSelector />
      </Container>
    </header>
  )
}
