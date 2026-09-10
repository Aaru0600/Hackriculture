import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { Hero } from '@/components/landing/Hero'
import { StatsStrip } from '@/components/landing/StatsStrip'
import { FeatureGrid } from '@/components/landing/FeatureGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ModulesShowcase } from '@/components/landing/ModulesShowcase'
import { CtaBand } from '@/components/landing/CtaBand'
import { SiteFooter } from '@/components/landing/SiteFooter'

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-canvas">
      <LandingNavbar />
      <main>
        <Hero />
        <StatsStrip />
        <FeatureGrid />
        <HowItWorks />
        <ModulesShowcase />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  )
}
