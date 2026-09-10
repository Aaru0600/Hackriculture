import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloud,
  CloudSun,
  Sun,
} from 'lucide-react'

/**
 * WMO weather interpretation codes (used by Open-Meteo) mapped to:
 *  - i18nKey: a key under `wmo.*` for the localised label
 *  - icon:    a lucide icon component
 *  - group:   coarse bucket used by alert logic and colour accents
 * Reference: https://open-meteo.com/en/docs (Weather variable documentation)
 */
const MAP = {
  0: { i18nKey: 'clear', icon: Sun, group: 'clear' },
  1: { i18nKey: 'mostlyClear', icon: CloudSun, group: 'clear' },
  2: { i18nKey: 'partlyCloudy', icon: CloudSun, group: 'clouds' },
  3: { i18nKey: 'overcast', icon: Cloud, group: 'clouds' },
  45: { i18nKey: 'fog', icon: CloudFog, group: 'fog' },
  48: { i18nKey: 'fog', icon: CloudFog, group: 'fog' },
  51: { i18nKey: 'drizzle', icon: CloudDrizzle, group: 'rain' },
  53: { i18nKey: 'drizzle', icon: CloudDrizzle, group: 'rain' },
  55: { i18nKey: 'drizzle', icon: CloudDrizzle, group: 'rain' },
  56: { i18nKey: 'freezingRain', icon: CloudDrizzle, group: 'rain' },
  57: { i18nKey: 'freezingRain', icon: CloudDrizzle, group: 'rain' },
  61: { i18nKey: 'rain', icon: CloudRain, group: 'rain' },
  63: { i18nKey: 'rain', icon: CloudRain, group: 'rain' },
  65: { i18nKey: 'heavyRain', icon: CloudRain, group: 'heavyRain' },
  66: { i18nKey: 'freezingRain', icon: CloudRain, group: 'rain' },
  67: { i18nKey: 'freezingRain', icon: CloudRain, group: 'heavyRain' },
  71: { i18nKey: 'snow', icon: CloudSnow, group: 'snow' },
  73: { i18nKey: 'snow', icon: CloudSnow, group: 'snow' },
  75: { i18nKey: 'snow', icon: CloudSnow, group: 'snow' },
  77: { i18nKey: 'snow', icon: CloudSnow, group: 'snow' },
  80: { i18nKey: 'rainShowers', icon: CloudRain, group: 'rain' },
  81: { i18nKey: 'rainShowers', icon: CloudRain, group: 'rain' },
  82: { i18nKey: 'heavyRain', icon: CloudRain, group: 'heavyRain' },
  85: { i18nKey: 'snowShowers', icon: CloudSnow, group: 'snow' },
  86: { i18nKey: 'snowShowers', icon: CloudSnow, group: 'snow' },
  95: { i18nKey: 'thunderstorm', icon: CloudLightning, group: 'storm' },
  96: { i18nKey: 'thunderstormHail', icon: CloudLightning, group: 'storm' },
  99: { i18nKey: 'thunderstormHail', icon: CloudLightning, group: 'storm' },
}

const UNKNOWN = { i18nKey: 'unknown', icon: Cloud, group: 'clouds' }

/** @param {number} code WMO weather code */
export function describeWeatherCode(code) {
  return MAP[code] ?? UNKNOWN
}
