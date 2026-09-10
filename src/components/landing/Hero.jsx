import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, CloudRain, Droplets, Leaf, Sparkles, TrendingUp } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PATHS } from '@/routes/paths'
import { fadeUp, stagger } from '@/lib/motion'
import { FarmScene } from './FarmScene'

function FloatCard({ icon: Icon, label, value, tone, className, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`absolute flex items-center gap-2.5 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 shadow-[var(--shadow-lift)] backdrop-blur ${className}`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        <span className="block text-sm font-bold text-ink">{value}</span>
      </span>
    </motion.div>
  )
}

export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden bg-field">
      <div className="pointer-events-none absolute inset-0 bg-rows opacity-60" />
      <Container className="relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <Badge variant="ai" iconLeft={<Sparkles className="h-3.5 w-3.5" />}>
              {t('hero.badge')}
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-balance text-4xl leading-[1.1] sm:text-5xl lg:text-6xl"
          >
            {t('hero.title')}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" to={PATHS.register} iconRight={<ArrowRight className="h-4.5 w-4.5" />}>
              {t('hero.ctaPrimary')}
            </Button>
            <Button size="lg" variant="outline" href="#features" target="_self">
              {t('hero.ctaSecondary')}
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-sm text-muted">
            {t('hero.trustNote')}
          </motion.p>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-lg"
        >
          <div className="relative rounded-[2rem] border border-line bg-white/70 p-3 shadow-[var(--shadow-lift)] backdrop-blur">
            <FarmScene className="h-auto w-full rounded-3xl" />
            <span className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              {t('hero.visualCaption')}
            </span>
          </div>

          <FloatCard
            icon={TrendingUp}
            label={t('hero.cards.yield')}
            value={t('hero.cards.yieldValue')}
            tone="bg-brand-100 text-brand-700"
            className="-left-4 top-10 sm:-left-8"
            delay={0.5}
          />
          <FloatCard
            icon={Leaf}
            label={t('hero.cards.soil')}
            value={t('hero.cards.soilValue')}
            tone="bg-earth-100 text-earth-700"
            className="-right-3 top-28 sm:-right-6"
            delay={0.65}
          />
          <FloatCard
            icon={Droplets}
            label={t('hero.cards.water')}
            value={t('hero.cards.waterValue')}
            tone="bg-info-soft text-info"
            className="-left-3 bottom-16 sm:-left-6"
            delay={0.8}
          />
          <FloatCard
            icon={CloudRain}
            label={t('hero.cards.weather')}
            value={t('hero.cards.weatherValue')}
            tone="bg-harvest-100 text-harvest-700"
            className="-right-2 bottom-6 sm:-right-5"
            delay={0.95}
          />
        </motion.div>
      </Container>
    </section>
  )
}
