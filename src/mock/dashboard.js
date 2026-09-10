/**
 * Mock farmer-dashboard payload. Shaped exactly like the spec's GET /api/dashboard
 * response so the real backend can drop in without touching components.
 * Values are illustrative sample data, not measurements.
 */
export function mockDashboard(user) {
  const size = user?.farmSize ?? 3.5
  const unit = user?.farmSizeUnit ?? 'acre'

  return {
    farmSummary: {
      farmName: user?.name ? `${user.name.split(' ')[0]}'s Farm` : 'My Farm',
      farmSize: size,
      farmSizeUnit: unit,
      currentCrop: 'Wheat',
      soilType: 'loam',
      location: [user?.district, user?.state].filter(Boolean).join(', ') || 'Not set',
      growthStage: 'vegetative',
      sownOn: '2026-07-12',
    },
    kpis: {
      expectedYield: { value: 4.8, unit: 't/ha', delta: 0.3, series: [4.1, 4.2, 4.0, 4.4, 4.6, 4.7, 4.8] },
      soilHealth: { value: 78, unit: '%', delta: 2, series: [70, 72, 71, 74, 76, 77, 78] },
      waterRequirement: { value: 32, unit: 'mm', delta: -4, series: [40, 44, 41, 38, 36, 34, 32] },
      cropHealth: { value: 86, unit: '%', delta: 1, series: [80, 82, 83, 84, 85, 85, 86] },
    },
    farmHealth: {
      score: 84,
      breakdown: [
        { key: 'soil', value: 78 },
        { key: 'water', value: 88 },
        { key: 'crop', value: 86 },
        { key: 'weatherRisk', value: 72 },
      ],
    },
    recentActivity: [
      { type: 'yield', at: '2026-09-07T09:20:00Z' },
      { type: 'fertilizer', at: '2026-09-04T14:05:00Z' },
      { type: 'irrigation', at: '2026-09-02T06:40:00Z' },
    ],
    isMock: true,
  }
}
