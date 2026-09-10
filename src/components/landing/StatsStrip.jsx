import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BrainCircuit, CloudSun, Droplets, FlaskConical, Languages } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { inView, stagger, fadeUp } from '@/lib/motion'

const ITEMS = [
  { key: 'predictions', icon: BrainCircuit },
  { key: 'irrigation', icon: Droplets },
  { key: 'fertilizer', icon: FlaskConical },
  { key: 'weather', icon: CloudSun },
  { key: 'multilingual', icon: Languages },
]

export function StatsStrip() {
  const { t } = useTranslation()
  return (
    <section className="border-y border-line bg-white">
      <Container className="py-8">
        <motion.p
          {...inView}
          variants={fadeUp}
          className="text-center text-xs font-bold uppercase tracking-[0.16em] text-muted"
        >
          {t('stats.heading')}
        </motion.p>
        <motion.ul
          {...inView}
          variants={stagger}
          className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-6"
        >
          {ITEMS.map(({ key, icon: Icon }) => (
            <motion.li
              key={key}
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink/80"
            >
              <Icon className="h-4 w-4 text-brand-600" />
              {t(`stats.items.${key}`)}
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  )
}
