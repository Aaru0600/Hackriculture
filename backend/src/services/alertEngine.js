/**
 * Rule-based farming-alert generation. Server-side twin of
 * `src/lib/farmAlerts.js` on the frontend - keep the thresholds in sync.
 * Returns provider-agnostic descriptors; the controller renders + persists them.
 */

/** English render templates (mirror `farmAlerts.*` in en.json). */
const RENDER = {
  heavyRain: (v) => ({
    title: 'Heavy rainfall expected',
    body: `About ${v.rain} mm of rain is likely over the next ${v.days} days. Hold off on irrigation and check field drainage.`,
  }),
  rain: (v) => ({
    title: 'Rain expected soon',
    body: `Rain is likely (${v.chance}% chance). Consider delaying irrigation and any fertiliser or spray application.`,
  }),
  heat: (v) => ({
    title: 'High temperature expected',
    body: `Highs near ${v.temp}°C in the coming days. Watch for crop water stress and irrigate in the early morning or evening.`,
  }),
  dryAir: (v) => ({
    title: 'Low humidity',
    body: `Humidity around ${v.humidity}%. Evaporation will be high - soil may dry out faster than usual.`,
  }),
  wind: (v) => ({
    title: 'Strong wind expected',
    body: `Winds up to ${v.wind} km/h. Avoid spraying and support young or tall crops.`,
  }),
  cold: (v) => ({
    title: 'Cold conditions',
    body: `Lows near ${v.temp}°C. Sensitive crops may need protection from cold or frost.`,
  }),
  clear: () => ({
    title: 'Good conditions for field work',
    body: 'Dry and settled weather over the next few days - a good window for sowing, spraying or harvest.',
  }),
  fertilizerReminder: (v) => ({
    title: 'Fertiliser window',
    body: `Your ${v.crop} is at an early growth stage. Check whether a fertiliser split is due and confirm the dose with a local officer.`,
  }),
}

export function renderAlert(type, values = {}) {
  return (RENDER[type] ?? (() => ({ title: type, body: '' })))(values)
}

/**
 * @param {{ current:object, daily:object[] }} bundle
 * @returns {Array<{ type:string, severity:string, values:object }>}
 */
export function deriveWeatherAlerts(bundle) {
  if (!bundle?.current || !bundle?.daily?.length) return []
  const out = []
  const { current, daily } = bundle
  const next3 = daily.slice(0, 3)

  const rain3 = next3.reduce((s, d) => s + (d.precipitationSum ?? 0), 0)
  const maxRainProb = Math.max(...next3.map((d) => d.precipitationProbability ?? 0))
  const maxHigh = Math.max(...next3.map((d) => d.tempMax ?? -99))
  const minLow = Math.min(...next3.map((d) => d.tempMin ?? 99))
  const maxWind = Math.max(current.windSpeed ?? 0, ...next3.map((d) => d.windMax ?? 0))

  if (rain3 >= 40) {
    out.push({ type: 'heavyRain', severity: 'danger', values: { rain: Math.round(rain3), days: next3.length } })
  } else if (maxRainProb >= 60 || (current.rainProbability ?? 0) >= 60) {
    out.push({ type: 'rain', severity: 'warning', values: { chance: Math.max(maxRainProb, current.rainProbability ?? 0) } })
  }
  if (maxHigh >= 38) out.push({ type: 'heat', severity: 'warning', values: { temp: Math.round(maxHigh) } })
  if ((current.humidity ?? 100) <= 30) out.push({ type: 'dryAir', severity: 'info', values: { humidity: Math.round(current.humidity) } })
  if (maxWind >= 35) out.push({ type: 'wind', severity: 'warning', values: { wind: Math.round(maxWind) } })
  if (minLow <= 5) out.push({ type: 'cold', severity: 'warning', values: { temp: Math.round(minLow) } })

  if (out.length === 0 && rain3 < 5 && maxHigh < 36) {
    out.push({ type: 'clear', severity: 'info', values: {} })
  }
  return out
}

/** @param {{ currentCrop?:string, growthStage?:string }} farm */
export function deriveFarmContextAlerts(farm) {
  if (!farm?.currentCrop) return []
  if (['sowing', 'vegetative'].includes(farm.growthStage)) {
    return [{ type: 'fertilizerReminder', severity: 'info', values: { crop: farm.currentCrop } }]
  }
  return []
}
