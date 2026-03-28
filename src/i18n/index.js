import es from './es.js'

const locales = { es }
let currentLocale = 'es'

export function setLocale(locale) {
  if (locales[locale]) currentLocale = locale
}

export function t(key) {
  return locales[currentLocale]?.[key] ?? locales['es'][key] ?? key
}
