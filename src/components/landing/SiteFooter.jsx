import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { PATHS } from '@/routes/paths'

const COLUMNS = [
  {
    heading: 'footer.product',
    links: [
      { label: 'features.items.yield.title', to: PATHS.cropPrediction },
      { label: 'features.items.cropReco.title', to: PATHS.cropRecommendation },
      { label: 'features.items.fertilizer.title', to: PATHS.fertilizer },
      { label: 'features.items.irrigation.title', to: PATHS.irrigation },
    ],
  },
  {
    heading: 'footer.resources',
    links: [
      { label: 'features.items.weather.title', to: PATHS.weather },
      { label: 'features.items.assistant.title', to: PATHS.aiAssistant },
      { label: 'features.items.history.title', to: PATHS.history },
    ],
  },
  {
    heading: 'footer.company',
    links: [
      { label: 'nav.about', to: PATHS.home },
      { label: 'common.login', to: PATHS.login },
      { label: 'common.register', to: PATHS.register },
    ],
  },
]

export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line bg-white">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {t('footer.tagline')}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/60">
                {t(col.heading)}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted transition-colors hover:text-brand-700"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} HACKRICULTURE. {t('footer.rights')}
          </p>
          <p>{t('footer.builtFor')}</p>
        </div>
      </Container>
    </footer>
  )
}
