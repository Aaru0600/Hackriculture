import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PATHS } from '@/routes/paths'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { LanguageSelector } from '@/components/LanguageSelector'

const LINKS = [
  { key: 'features', href: '#features' },
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'modules', href: '#modules' },
]

export function LandingNavbar() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-200',
        scrolled
          ? 'border-b border-line bg-white/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 transition-colors hover:bg-black/5 hover:text-ink"
            >
              {t(`nav.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          <LanguageSelector />
          <Button variant="ghost" size="sm" to={PATHS.login}>
            {t('common.login')}
          </Button>
          <Button size="sm" to={PATHS.register}>
            {t('common.getStarted')}
          </Button>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-black/5 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {menuOpen && (
        <div className="md:hidden">
          <Container className="flex flex-col gap-2 border-t border-line bg-white pb-6 pt-4">
            {LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-semibold text-ink/80 hover:bg-black/5"
              >
                {t(`nav.${link.key}`)}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between">
              <LanguageSelector align="left" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" to={PATHS.login} onClick={() => setMenuOpen(false)}>
                {t('common.login')}
              </Button>
              <Button to={PATHS.register} onClick={() => setMenuOpen(false)}>
                {t('common.getStarted')}
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
