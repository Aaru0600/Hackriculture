import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { FEATURES, ACCENT_CLASSES } from '@/data/features'
import { inView, stagger, fadeUp } from '@/lib/motion'

// The four guided ML tools from the brief.
const MODULE_KEYS = ['yield', 'cropReco', 'fertilizer', 'irrigation']

export function ModulesShowcase() {
  const { t } = useTranslation()
  const modules = FEATURES.filter((f) => MODULE_KEYS.includes(f.key))

  return (
    <section id="modules" className="scroll-mt-20 bg-soil py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={t('modules.eyebrow')}
          title={t('modules.heading')}
        />

        <motion.div
          {...inView}
          variants={stagger}
          className="mt-12 grid gap-4 md:grid-cols-2"
        >
          {modules.map(({ key, icon: Icon, accent, to }) => (
            <motion.div
              key={key}
              variants={fadeUp}
              className="group card flex flex-col gap-5 p-6 sm:flex-row sm:items-start"
            >
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-colors ${ACCENT_CLASSES[accent]}`}
              >
                <Icon className="h-7 w-7" strokeWidth={2.1} />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {t(`features.items.${key}.desc`)}
                </p>
                <Button
                  to={to}
                  variant="ghost"
                  size="sm"
                  className="mt-3 -ml-2 px-2 text-brand-700"
                  iconRight={
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  }
                >
                  {t('common.learnMore')}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
