import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { PATHS } from '@/routes/paths'
import { inView, fadeUp } from '@/lib/motion'

export function CtaBand() {
  const { t } = useTranslation()

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <motion.div
          {...inView}
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-14 text-center text-white sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-rows opacity-20" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-harvest-400/30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl text-white sm:text-4xl">{t('cta.heading')}</h2>
            <p className="mt-4 text-base text-white/85 sm:text-lg">
              {t('cta.subheading')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                variant="white"
                to={PATHS.register}
                iconRight={<ArrowRight className="h-4.5 w-4.5" />}
              >
                {t('cta.primary')}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                to={PATHS.login}
                className="text-white hover:bg-white/10"
              >
                {t('cta.secondary')}
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
