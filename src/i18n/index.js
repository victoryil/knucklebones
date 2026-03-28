import es from './es.js'
import en from './en.js'

const locales = { es, en }
let currentLocale = 'es'

export function setLocale(locale) {
  if (locales[locale]) currentLocale = locale
}

export function getCurrentLocale() {
  return currentLocale
}

export function t(key) {
  return locales[currentLocale]?.[key] ?? locales['es'][key] ?? key
}
