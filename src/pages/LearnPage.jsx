import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { FEATURE_DOCS } from '@/data/featureDocs'
import { PATHS } from '@/routes/paths'

export default function LearnPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const doc = FEATURE_DOCS[slug]

  if (!doc) return <Navigate to={PATHS.home} replace />

  return (
    <div className="min-h-svh bg-canvas">
      <LandingNavbar />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <Link to={`${PATHS.home}#features`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={15} /> {t('learn.allFeatures')}
          </Link>

          <div className="mt-4 flex items-center gap-2 text-brand-600">
            <BookOpen size={18} />
            <span className="text-xs font-bold uppercase tracking-[0.14em]">{t('learn.eyebrow')}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-lg text-muted">{doc.tagline}</p>

          <div className="mt-8 flex flex-col gap-6">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-bold text-ink">{s.heading}</h2>
                <p className="mt-1.5 leading-relaxed text-ink/80">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
            <p className="text-sm text-ink/80">{t('learn.ctaHint')}</p>
            <Button to={doc.cta.to} size="sm" className="mt-3">
              {doc.cta.label} <ArrowRight size={15} />
            </Button>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted">{t('learn.disclaimer')}</p>
        </Container>
      </main>
      <SiteFooter />
    </div>
  )
}
