/**
 * Mock crop-yield prediction. Shaped exactly like the backend's
 * `POST /api/predictions/yield` response (`predictionController.toClient`) so the
 * real backend drops in without touching the page.
 *
 * The numbers here are a crude illustrative heuristic - NOT a model, NOT
 * measurements. The real estimate comes from the Python ML service.
 */

// Rough national-average yields (t/ha) for the shape only.
const BASE_YIELD = {
  rice: 2.7, wheat: 3.2, maize: 2.8, cotton: 0.5,
  sugarcane: 70, soybean: 1.1, groundnut: 1.3, potato: 20,
}
const OPT = {
  rice: { ph: 6.5, temp: 27 }, wheat: { ph: 6.8, temp: 18 },
  maize: { ph: 6.2, temp: 24 }, cotton: { ph: 6.5, temp: 28 },
  sugarcane: { ph: 6.5, temp: 30 }, soybean: { ph: 6.5, temp: 26 },
  groundnut: { ph: 6.3, temp: 27 }, potato: { ph: 5.8, temp: 18 },
}

const bell = (v, c, s) => Math.exp(-0.5 * ((v - c) / s) ** 2)
const round = (n, d = 2) => Number(n.toFixed(d))

export function mockYieldPrediction(input) {
  const crop = String(input.crop || 'wheat').toLowerCase()
  const base = BASE_YIELD[crop] ?? 2.5
  const opt = OPT[crop] ?? { ph: 6.5, temp: 25 }

  let adj = 1
  const parts = []
  if (input.soilPH != null) {
    const m = 0.7 + 0.3 * bell(Number(input.soilPH), opt.ph, 1.2)
    adj *= m
    parts.push({ input: 'ph', label: 'Soil pH', multiplier: round(m, 3),
      direction: m > 1.01 ? 'raises the estimate' : m < 0.99 ? 'lowers the estimate' : 'about neutral' })
  }
  if (input.temperature != null) {
    const m = 0.7 + 0.3 * bell(Number(input.temperature), opt.temp, 7)
    adj *= m
    parts.push({ input: 'temperature', label: 'Season temperature', multiplier: round(m, 3),
      direction: m > 1.01 ? 'raises the estimate' : m < 0.99 ? 'lowers the estimate' : 'about neutral' })
  }
  if (input.nitrogen != null && input.phosphorus != null && input.potassium != null) {
    const supplied = (Number(input.nitrogen) + Number(input.phosphorus) + Number(input.potassium)) / 3
    const m = Math.max(0.75, Math.min(1.1, 0.6 + supplied / 180))
    adj *= m
    parts.push({ input: 'npk', label: 'Soil N-P-K vs recommended dose', multiplier: round(m, 3),
      direction: m > 1.01 ? 'raises the estimate' : m < 0.99 ? 'lowers the estimate' : 'about neutral' })
  }
  adj = Math.max(0.72, Math.min(1.15, adj))

  const core = round(base * (0.85 + Math.random() * 0.1), 3)
  const predicted = round(core * adj, 3)
  const spread = 0.22
  const quality = parts.length ? 74 : 66
  const label = quality >= 75 ? 'high' : quality >= 55 ? 'medium' : 'low'
  const farm = Number(input.farmSize) || null

  const sweep = (centre, span, fn) =>
    Array.from({ length: 12 }, (_, i) => {
      const x = centre - span + (2 * span * i) / 11
      return { x: round(x, 1), yield_t_ha: round(predicted * fn(x), 3) }
    })

  return {
    id: `mock_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    predictedYield: predicted,
    unit: 'tons/hectare',
    yieldRange: [round(Math.max(0, predicted * (1 - 1.28 * spread)), 3), round(predicted * (1 + 1.28 * spread), 3)],
    expectedProduction: farm ? round(predicted * farm, 2) : null,
    predictionQuality: quality,
    predictionQualityLabel: label,
    predictionQualityNote:
      'Reliability score, not a calibrated probability. Verify with a local agricultural expert and a soil test.',
    riskLevel: predicted < 0.55 * base ? 'high' : predicted < 0.8 * base ? 'moderate' : 'low',
    coreYield: core,
    adjustmentFactor: round(adj, 3),
    adjustmentInputsUsed: parts.map((p) => p.input),
    adjustmentDetail: parts,
    referenceYield: base,
    importantFactors: [
      { feature: 'annual_rainfall_mm', label: 'Annual rainfall', source: 'regional data', impact_t_ha: 0.12, direction: 'raises yield' },
      ...parts.map((p) => ({
        feature: p.input, label: p.label, source: 'agronomic input',
        impact_t_ha: round(core * (p.multiplier - 1), 3),
        direction: p.direction,
      })),
    ].sort((a, b) => Math.abs(b.impact_t_ha) - Math.abs(a.impact_t_ha)).slice(0, 6),
    responseCurves: {
      rainfall: sweep((opt.temp && 900) || 900, 700, (x) => 0.6 + 0.5 * bell(x, 1000, 500)),
      temperature: sweep(opt.temp, 15, (x) => bell(x, opt.temp, 7)),
    },
    modelVersion: 'mock',
    modelSource: 'mock',
    disclaimer:
      'Estimate only. Yields vary with local soil, weather and management. ' +
      'Verify with a local agricultural expert and a current soil test before acting.',
  }
}

export function mockYieldHistory() {
  return { items: [], page: 1, limit: 20, total: 0, pages: 0 }
}
