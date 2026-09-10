/**
 * Offline fallback soil estimate, used when a live SoilGrids call is
 * unavailable. Mid-range values for a loamy soil - synthetic, not a
 * measurement. Same shape as soilService's live result. A real soil test
 * always overrides this.
 */
export function mockSoilEstimate(location) {
  return {
    location: location ?? { latitude: 26.85, longitude: 80.95 },
    soilPH: 6.7,
    totalNitrogen: 1.4, // g/kg total soil nitrogen (indicative)
    nitrogenLevelKey: 'medium',
    organicCarbon: 0.62, // %
    texture: { sand: 42, silt: 38, clay: 20 },
    soilTypeKey: 'loam',
    depth: '0-5cm',
    provider: 'sample data',
    isMock: true,
  }
}
