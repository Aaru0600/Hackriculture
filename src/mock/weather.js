/**
 * Offline fallback weather. Used when VITE_DIRECT_DATA_APIS is off and there is
 * no backend, or when a live call fails. Values are plausible for the Indian
 * plains in the current season - clearly synthetic, not a real observation.
 */
function buildForecast() {
  const today = new Date()
  const codes = [1, 2, 3, 61, 80, 2, 1]
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const rainy = codes[i] >= 51
    return {
      date: date.toISOString().slice(0, 10),
      weatherCode: codes[i],
      tempMax: 30 + Math.round(Math.sin(i) * 3),
      tempMin: 20 + Math.round(Math.cos(i) * 2),
      precipitationSum: rainy ? 6 + i * 2 : 0,
      precipitationProbability: rainy ? 60 + i * 3 : 10 + i * 2,
      windMax: 12 + i,
    }
  })
}

export function mockWeatherBundle(location) {
  return {
    location: location ?? { latitude: 26.85, longitude: 80.95, name: 'Sample location', admin1: '' },
    current: {
      temperature: 31,
      apparentTemperature: 34,
      humidity: 58,
      precipitation: 0,
      rainProbability: 45,
      windSpeed: 14,
      weatherCode: 2,
      time: new Date().toISOString(),
    },
    daily: buildForecast(),
    provider: 'sample data',
    isMock: true,
  }
}
