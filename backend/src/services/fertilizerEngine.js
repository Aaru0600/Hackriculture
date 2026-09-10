/**
 * Rule-based fertiliser recommendation. The spec calls for a rule / hybrid
 * approach here (no trained model). Compares supplied soil N-P-K against a
 * per-crop recommended dose and converts each deficit into a common straight
 * fertiliser, plus a pH amendment note. Pure - no I/O.
 *
 * Mirrors the frontend calculator in `src/mock/fertilizer.js`; keep the two in
 * sync. Illustrative planning figures only, never a substitute for a lab test.
 */

// Recommended nutrient dose (kg/ha) per crop - matches ml-service CROP_PROFILE.
const RECOMMENDED = {
  rice: { n: 120, p: 60, k: 60 }, wheat: { n: 120, p: 60, k: 40 },
  maize: { n: 120, p: 60, k: 40 }, cotton: { n: 100, p: 50, k: 50 },
  sugarcane: { n: 250, p: 115, k: 115 }, soybean: { n: 30, p: 75, k: 45 },
  groundnut: { n: 25, p: 50, k: 75 }, potato: { n: 180, p: 80, k: 100 },
}

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

/**
 * @param {{ crop:string, nitrogen:number, phosphorus:number, potassium:number,
 *   soilPH?:number, growthStage?:string, soilType?:string }} input
 */
export function recommendFertilizer(input) {
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
      + 'Applying the quantities below brings the soil up to the recommended dose.'

  return {
    crop,
    recommendedDose: { nitrogen: rec.n, phosphorus: rec.p, potassium: rec.k, unit: 'kg/ha' },
    deficiencies,
    items,
    applicationTiming: STAGE_TIMING[stage] || STAGE_TIMING.sowing,
    applicationMethod:
      'Band placement near the root zone for phosphorus; broadcast and incorporate for nitrogen and potassium.',
    soilAmendment: amendment,
    explanation,
    model_version: 'rules-1.0',
    model_source: 'rule_based',
    disclaimer:
      'Rule-based estimate from typical recommended doses. Dosage is not universally '
      + 'correct - get a local soil test and confirm with an agronomist before applying.',
  }
}
