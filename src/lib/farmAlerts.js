import {
  CloudRain, Droplets, FlaskConical, Snowflake, Sun, ThermometerSun, Wind,
} from 'lucide-react'

/**
 * Derive farming alerts from a weather bundle. Pure and rule-based - the same
 * shape the Node alertService will produce later. Each alert carries an i18n
 * key under `farmAlerts.*` plus interpolation values; the component localises.
 *
 * @param {{current:object, daily:object[]}} bundle
 * @returns {Array<{ id:string, severity:'info'|'warning'|'danger', icon:Function, i18nKey:string, values:object }>}
 */
export function deriveFarmAlerts(bundle) {
  if (!bundle?.current || !bundle?.daily?.length) return []

  const alerts = []
  const { current, daily } = bundle
  const next3 = daily.slice(0, 3)

  const rain3 = next3.reduce((sum, d) => sum + (d.precipitationSum ?? 0), 0)
  const maxRainProb = Math.max(...next3.map((d) => d.precipitationProbability ?? 0))
  const maxHigh = Math.max(...next3.map((d) => d.tempMax ?? -99))
  const minLow = Math.min(...next3.map((d) => d.tempMin ?? 99))
  const maxWind = Math.max(current.windSpeed ?? 0, ...next3.map((d) => d.windMax ?? 0))

  if (rain3 >= 40) {
    alerts.push({
      id: 'heavyRain',
      severity: 'danger',
      icon: CloudRain,
      i18nKey: 'farmAlerts.heavyRain',
      values: { rain: Math.round(rain3), days: next3.length },
    })
  } else if (maxRainProb >= 60 || (current.rainProbability ?? 0) >= 60) {
    alerts.push({
      id: 'rain',
      severity: 'warning',
      icon: CloudRain,
      i18nKey: 'farmAlerts.rain',
      values: { chance: Math.max(maxRainProb, current.rainProbability ?? 0) },
    })
  }

  if (maxHigh >= 38) {
    alerts.push({
      id: 'heat',
      severity: 'warning',
      icon: ThermometerSun,
      i18nKey: 'farmAlerts.heat',
      values: { temp: Math.round(maxHigh) },
    })
  }

  if ((current.humidity ?? 100) <= 30) {
    alerts.push({
      id: 'dryAir',
      severity: 'info',
      icon: Droplets,
      i18nKey: 'farmAlerts.dryAir',
      values: { humidity: Math.round(current.humidity) },
    })
  }

  if (maxWind >= 35) {
    alerts.push({
      id: 'wind',
      severity: 'warning',
      icon: Wind,
      i18nKey: 'farmAlerts.wind',
      values: { wind: Math.round(maxWind) },
    })
  }

  if (minLow <= 5) {
    alerts.push({
      id: 'cold',
      severity: 'warning',
      icon: Snowflake,
      i18nKey: 'farmAlerts.cold',
      values: { temp: Math.round(minLow) },
    })
  }

  if (alerts.length === 0 && rain3 < 5 && maxHigh < 36) {
    alerts.push({
      id: 'clear',
      severity: 'info',
      icon: Sun,
      i18nKey: 'farmAlerts.clear',
      values: {},
    })
  }

  return alerts
}

/**
 * Alerts derived from a farm's own crop-cycle profile (not weather). Rule-based
 * and intentionally conservative - just a fertiliser-window reminder for now.
 *
 * @param {{ currentCrop?:string, growthStage?:string }} farm
 * @returns {Array<{ id:string, severity:string, icon:Function, i18nKey:string, values:object }>}
 */
export function deriveFarmContextAlerts(farm) {
  if (!farm?.currentCrop) return []
  const out = []
  if (['sowing', 'vegetative'].includes(farm.growthStage)) {
    out.push({
      id: 'fertilizerReminder',
      severity: 'info',
      icon: FlaskConical,
      i18nKey: 'farmAlerts.fertilizerReminder',
      values: { crop: farm.currentCrop },
    })
  }
  return out
}

export const ALERT_STYLES = {
  info: { chip: 'bg-info-soft text-info', bar: 'bg-info' },
  warning: { chip: 'bg-warning-soft text-warning', bar: 'bg-warning' },
  danger: { chip: 'bg-danger-soft text-danger', bar: 'bg-danger' },
}

/** Alert type -> icon, so a server-sent alert (no icon component) still renders one. */
export const ALERT_ICONS = {
  heavyRain: CloudRain,
  rain: CloudRain,
  heat: ThermometerSun,
  dryAir: Droplets,
  wind: Wind,
  cold: Snowflake,
  clear: Sun,
  fertilizerReminder: FlaskConical,
}
