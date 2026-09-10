import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { CROP_TIMELINE, timelineStep } from '@/data/farmOptions'
import { cn } from '@/lib/cn'

/**
 * The spec's crop timeline: Land Preparation -> Sowing -> Germination ->
 * Vegetative Growth -> Flowering -> Harvest. The current step is derived from
 * the farm's stored `growthStage`. Scrolls horizontally on narrow screens.
 */
export function CropTimeline({ growthStage }) {
  const { t } = useTranslation()
  const current = timelineStep(growthStage)

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[34rem] items-start gap-0">
        {CROP_TIMELINE.map((key, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    i === 0 ? 'bg-transparent' : done || active ? 'bg-brand-500' : 'bg-line',
                  )}
                />
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-colors',
                    done && 'border-brand-500 bg-brand-500 text-white',
                    active && 'border-brand-600 bg-brand-50 text-brand-700 ring-4 ring-brand-100',
                    !done && !active && 'border-line bg-white text-muted',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    i === CROP_TIMELINE.length - 1
                      ? 'bg-transparent'
                      : done ? 'bg-brand-500' : 'bg-line',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-2 px-1 text-xs leading-tight',
                  active ? 'font-bold text-ink' : 'font-medium text-muted',
                )}
              >
                {t(`myFarm.timeline.${key}`)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
