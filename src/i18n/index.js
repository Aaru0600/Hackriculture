import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hi from './locales/hi.json'
import pa from './locales/pa.json'
import mr from './locales/mr.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import bn from './locales/bn.json'

/**
 * Supported languages. Each has a full locale file, so the whole UI switches
 * when the user picks one. English is the fallback for any missing key.
 * Regional translations are machine-assisted - flag anything that reads
 * unnaturally for a native review pass.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
]

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  pa: { translation: pa },
  mr: { translation: mr },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnObjects: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'hk_lang',
      caches: ['localStorage'],
    },
  })

// Keep <html lang> in sync for accessibility and correct font shaping.
const applyHtmlLang = (lng) => {
  document.documentElement.setAttribute('lang', lng)
}
applyHtmlLang(i18n.resolvedLanguage)
i18n.on('languageChanged', applyHtmlLang)

export default i18n
