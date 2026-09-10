import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { FEATURES, ACCENT_CLASSES } from '@/data/features'
import { inView, stagger, fadeUp } from '@/lib/motion'

export function FeatureGrid() {
  const { t } = useTranslation()

  return (
    <section id="features" className="scroll-mt-20 bg-soil py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={t('features.eyebrow')}
          title={t('features.heading')}
          subtitle={t('features.subheading')}
        />

        <motion.div
          {...inView}
          variants={stagger}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map(({ key, icon: Icon, accent }) => (
            <motion.div key={key} variants={fadeUp}>
              <Link
                to={`/learn/${key}`}
                className="group card flex h-full flex-col gap-4 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-200 ${ACCENT_CLASSES[accent]}`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <div className="flex-1">
                  <h3 className="flex items-center gap-1 text-base font-bold">
                    {t(`features.items.${key}.title`)}
                    <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {t(`features.items.${key}.desc`)}
                  </p>
                  <span className="mt-2 inline-block text-xs font-semibold text-brand-600">
                    {t('learn.readMore')}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
