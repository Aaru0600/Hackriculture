import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ClipboardList, Cpu, MapPinHouse, Sprout } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { inView, stagger, fadeUp } from '@/lib/motion'

const STEPS = [
  { key: 'one', icon: MapPinHouse },
  { key: 'two', icon: ClipboardList },
  { key: 'three', icon: Cpu },
  { key: 'four', icon: Sprout },
]

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={t('howItWorks.eyebrow')}
          title={t('howItWorks.heading')}
        />

        <motion.ol
          {...inView}
          variants={stagger}
          className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map(({ key, icon: Icon }, i) => (
            <motion.li
              key={key}
              variants={fadeUp}
              className="relative rounded-2xl border border-line bg-canvas p-5"
            >
              <span className="absolute right-4 top-4 font-display text-4xl font-extrabold text-brand-100">
                {i + 1}
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">
                {t(`howItWorks.steps.${key}.title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t(`howItWorks.steps.${key}.desc`)}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </section>
  )
}
