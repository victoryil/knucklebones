/**
 * Win/loss/draw tracker — persists to localStorage under 'knucklebones-stats'.
 * Modes: 'local' | 'online' | 'bot-easy' | 'bot-normal' | 'bot-hard'
 */

const KEY = 'knucklebones-stats'
const MODES = ['local', 'online', 'bot-easy', 'bot-normal', 'bot-hard']
const empty = () => ({ wins: 0, losses: 0, draws: 0 })

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const s = {}
      for (const m of MODES) s[m] = { ...empty(), ...(parsed[m] ?? {}) }
      return s
    }
  } catch {}
  return Object.fromEntries(MODES.map(m => [m, empty()]))
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export const statsStore = load()

function modeKey(mode, difficulty) {
  return mode === 'bot' ? `bot-${difficulty}` : mode
}

export function recordResult(mode, difficulty, outcome) {
  // outcome: 'win' | 'loss' | 'draw'
  const key = modeKey(mode, difficulty)
  if (!statsStore[key]) statsStore[key] = empty()
  const field = outcome === 'win' ? 'wins' : outcome === 'loss' ? 'losses' : 'draws'
  statsStore[key][field]++
  persist(statsStore)
}

export function getRecord(mode, difficulty) {
  return statsStore[modeKey(mode, difficulty)] ?? empty()
}
