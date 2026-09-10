/**
 * Rule-based fertilizer recommendation (no ML model yet - the spec calls for a
 * rule/hybrid approach here). Compares supplied soil N-P-K against a per-crop
 * recommended dose and converts each deficit into a common straight fertilizer.
 * Illustrative planning figures only - not a substitute for a lab soil test.
 */

// Recommended nutrient dose (kg/ha) per crop - matches ml-service CROP_PROFILE.
const RECOMMENDED = {
  rice: { n: 120, p: 60, k: 60 }, wheat: { n: 120, p: 60, k: 40 },
  maize: { n: 120, p: 60, k: 40 }, cotton: { n: 100, p: 50, k: 50 },
  sugarcane: { n: 250, p: 115, k: 115 }, soybean: { n: 30, p: 75, k: 45 },
  groundnut: { n: 25, p: 50, k: 75 }, potato: { n: 180, p: 80, k: 100 },
}

// Straight fertilizers: nutrient content fractions.
const SOURCES = {
  n: { name: 'Urea', frac: 0.46, nutrient: 'nitrogen' },
  p: { name: 'DAP (di-ammonium phosphate)', frac: 0.46, nutrient: 'phosphorus' },
  k: { name: 'MOP (muriate of potash)', frac: 0.60, nutrient: 'potassium' },
}

const STAGE_TIMING = {
  sowing: 'Apply as a basal dose at land preparation / sowing.',
  vegetative: 'Top-dress now; split the nitrogen into 2 - 3 applications.',
  flowering: 'Apply the remaining nitrogen and potassium before flowering.',
  maturity: 'Avoid fresh nitrogen this late; a light potassium dose only if deficient.',
}

const round = (n) => Math.round(n)

export function mockFertilizerRecommendation(input) {
  const crop = String(input.crop || 'wheat').toLowerCase()
  const rec = RECOMMENDED[crop] || { n: 100, p: 50, k: 40 }
  const have = {
    n: Number(input.nitrogen) || 0,
    p: Number(input.phosphorus) || 0,
    k: Number(input.potassium) || 0,
  }
  const deficit = {
    n: Math.max(0, rec.n - have.n),
    p: Math.max(0, rec.p - have.p),
    k: Math.max(0, rec.k - have.k),
  }

  const items = Object.entries(deficit)
    .filter(([, d]) => d > 4)
    .map(([key, d]) => {
      const src = SOURCES[key]
      return {
        nutrient: src.nutrient,
        deficitKgPerHa: round(d),
        fertilizer: src.name,
        quantityKgPerHa: round(d / src.frac),
      }
    })

  const deficiencies = items.map((i) => i.nutrient)
  const stage = String(input.growthStage || 'sowing').toLowerCase()

  const ph = Number(input.soilPH)
  let amendment = null
  if (Number.isFinite(ph)) {
    if (ph < 5.5) amendment = 'Soil is acidic (pH < 5.5) - apply agricultural lime 1 - 2 t/ha a few weeks before sowing.'
    else if (ph > 8.2) amendment = 'Soil is alkaline (pH > 8.2) - apply gypsum and use ammonium-based nitrogen.'
  }

  const primary = items.slice().sort((a, b) => b.deficitKgPerHa - a.deficitKgPerHa)[0]
  const explanation = items.length === 0
    ? `Your soil N-P-K is at or above the recommended dose for ${crop}. Hold fertiliser and re-test after this crop.`
    : `${primary.nutrient[0].toUpperCase()}${primary.nutrient.slice(1)} is the most limiting nutrient for ${crop}. `
      + `Applying the quantities below brings the soil up to the recommended dose.`

  return {
    id: `mock_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    crop,
    recommendedDose: { nitrogen: rec.n, phosphorus: rec.p, potassium: rec.k, unit: 'kg/ha' },
    deficiencies,
    items,
    applicationTiming: STAGE_TIMING[stage] || STAGE_TIMING.sowing,
    applicationMethod: 'Band placement near the root zone for phosphorus; broadcast and incorporate for nitrogen and potassium.',
    soilAmendment: amendment,
    explanation,
    modelVersion: 'rules-1.0',
    modelSource: 'rule_based',
    disclaimer:
      'Rule-based estimate from typical recommended doses. Dosage is not universally '
      + 'correct - get a local soil test and confirm with an agronomist before applying.',
  }
}
