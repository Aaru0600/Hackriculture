import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { LanguageSelector } from '@/components/LanguageSelector'
import { VoiceNavButton } from '@/components/VoiceNavButton'
import { useAuth } from '@/context/AuthContext'

/** Slim top bar: menu button + logo on mobile, page title + language elsewhere. */
export function DashboardTopbar({ title, onMenu }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-black/5 lg:hidden"
        aria-label={t('common.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="lg:hidden">
        <Logo showText={false} />
      </div>

      <h1 className="hidden text-lg font-bold lg:block">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <VoiceNavButton />
        <LanguageSelector />
        <span className="hidden h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 sm:grid">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  )
}
