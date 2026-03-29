/**
 * Settings store — reads/writes to localStorage under 'knucklebones-settings'.
 * Imported as a singleton by AudioEngine, SceneManager, and the SettingsPanel.
 */

const KEY = 'knucklebones-settings'

const DEFAULTS = {
  masterVolume: 0.8,
  musicVolume: 0.35,
  sfxVolume: 1.0,
  musicEnabled: true,
  sfxEnabled: true,
  bloomEnabled: false,   // off by default — user enables in settings
  shakeEnabled: true,
  particlesEnabled: true,
  quality: 'medium',    // 'high' | 'medium' | 'low'
  fastAnimations: false,
  botDifficulty: 'normal', // 'easy' | 'normal' | 'hard'
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export const settings = load()

export function updateSetting(key, value) {
  settings[key] = value
  persist(settings)
}
