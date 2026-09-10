/**
 * Mock crop & irrigation recommendations. Same response shape as the backend
 * (`recommendationController`). The numbers are a crude illustrative heuristic,
 * NOT a model - the real output comes from the Python ML service.
 */

const CROP_REF = {
  rice: { water: 'High', dur: [110, 150], y: [3, 6], note: 'warm, very wet' },
  maize: { water: 'Medium', dur: [90, 120], y: [2.5, 6], note: 'warm, well-drained loam' },
  cotton: { water: 'Medium', dur: [150, 180], y: [1, 2.5], note: 'long warm season' },
  chickpea: { water: 'Low', dur: [90, 120], y: [1, 2], note: 'cool dry rabi pulse' },
  banana: { water: 'High', dur: [300, 365], y: [30, 60], note: 'humid tropics, heavy feeder' },
  mungbean: { water: 'Low', dur: [60, 90], y: [0.8, 1.4], note: 'short-duration pulse' },
}

const round = (n, d = 1) => Number(n.toFixed(d))

export function mockCropRecommendation(input) {
  const wet = (Number(input.rainfall) || 100) > 150 && (Number(input.humidity) || 50) > 70
  const cool = (Number(input.temperature) || 25) < 22
  const order = wet
    ? ['rice', 'banana', 'maize']
    : cool
      ? ['chickpea', 'maize', 'mungbean']
      : ['maize', 'cotton', 'mungbean']

  const scores = [78 + Math.random() * 15, 9 + Math.random() * 6, 2 + Math.random() * 3]
  const recommendations = order.map((crop, i) => {
    const r = CROP_REF[crop] ?? { water: 'Medium', dur: [100, 130], y: [2, 4], note: '' }
    return {
      crop,
      suitabilityScore: round(scores[i]),
      expectedYield: { low: r.y[0], high: r.y[1], unit: 't/ha' },
      waterRequirement: r.water,
      durationDays: { low: r.dur[0], high: r.dur[1] },
      expectedProfit: null,
      profitNote: 'Not estimated - depends on local market price and input costs.',
      whyRecommended: `Your inputs broadly match this crop's needs; ${r.note}.`,
      matchedConditions: wet ? ['rainfall', 'humidity'] : ['temperature'],
    }
  })
  return {
    id: `mock_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    recommendations,
    alternatives: [{ crop: 'jute', suitabilityScore: round(1 + Math.random() * 2) }],
    modelVersion: 'mock',
    modelSource: 'mock',
    disclaimer:
      'Suitability is illustrative only. Confirm with a local agricultural officer before sowing.',
  }
}

const STAGE_MM = { sowing: 35, vegetative: 50, flowering: 55, harvest: 18 }

export function mockIrrigationRecommendation(input) {
  const m = Number(input.soilMoisture)
  const need = Number.isFinite(m) ? (m < 20 ? 'High' : m < 38 ? 'Medium' : 'Low') : 'Medium'
  const scale = { High: 1.35, Medium: 1, Low: 0.55 }[need]
  const base = STAGE_MM[String(input.growthStage || 'vegetative').toLowerCase()] ?? 50
  let net = base * scale
  const fp = Number(input.forecastRainProbability)
  let rainfallAdjustment = 'No forecast rainfall adjustment applied.'
  if (Number.isFinite(fp) && fp >= 60) {
    const cut = Math.min(net * 0.6, 25)
    net = Math.max(0, net - cut)
    rainfallAdjustment = `${fp.toFixed(0)}% chance of rain soon - reduce this irrigation by ~${cut.toFixed(0)} mm, or skip it if rain arrives.`
  }
  const eff = { drip: 0.9, sprinkler: 0.75, canal: 0.55, rainfed: 0.55 }[input.irrigationType] ?? 0.75
  const gross = net / eff
  const days = { High: 2, Medium: 4, Low: 8 }[need]
  const area = Number(input.farmSize) || 1

  return {
    id: `mock_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    irrigationNeed: need,
    needConfidence: 60,
    priority: need,
    waterRequirement: {
      netDepthMm: round(net),
      grossDepthMm: round(gross),
      litresPerHectare: Math.round(gross * 10000),
      totalVolumeM3: round(gross * 10 * area),
      text: `~${gross.toFixed(0)} mm (${input.irrigationType || 'sprinkler'})`,
    },
    nextIrrigation: m < 12 ? 'Now' : `In about ${days} days`,
    duration: `~${round((gross * 10 * area * 1000) / (6 * area * 3600), 1)} hours for ${area} ha`,
    rainfallAdjustment,
    reason: `Because soil moisture is ${Number.isFinite(m) ? (m < 20 ? 'low' : 'adequate') : 'unknown'}.`,
    assumptions: ['illustrative heuristic - not a trained model in mock mode'],
    modelVersion: 'mock',
    modelSource: 'mock',
    disclaimer:
      'Check against your own field moisture readings and local extension advice before irrigating.',
  }
}
