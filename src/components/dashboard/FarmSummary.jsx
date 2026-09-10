import { useTranslation } from 'react-i18next'
import { CalendarClock, Layers, MapPin, Ruler, Sprout } from 'lucide-react'
import { Card } from '@/components/ui/Card'

function Item({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-brand-600">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  )
}

export function FarmSummary({ summary }) {
  const { t } = useTranslation()
  const dash = '—'
  const stageLabel = summary.growthStage
    ? t(`dashboard.stages.${summary.growthStage}`, summary.growthStage)
    : dash
  const soilLabel = summary.soilType
    ? t(`soilType.${summary.soilType}`, summary.soilType)
    : dash

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{summary.farmName}</h2>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {t('dashboard.summary.title')}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Item
          icon={Ruler}
          label={t('dashboard.summary.farmSize')}
          value={summary.farmSize != null
            ? `${summary.farmSize} ${t(`auth.units.${summary.farmSizeUnit}`, summary.farmSizeUnit)}`
            : dash}
        />
        <Item icon={Sprout} label={t('dashboard.summary.currentCrop')} value={summary.currentCrop || dash} />
        <Item icon={Layers} label={t('dashboard.summary.soilType')} value={soilLabel} />
        <Item icon={MapPin} label={t('dashboard.summary.location')} value={summary.location || dash} />
        <Item icon={CalendarClock} label={t('dashboard.summary.growthStage')} value={stageLabel} />
      </div>
    </Card>
  )
}
