export const COLS = 3
export const SLOTS = 3

export const PHASES = {
  IDLE: 'idle',
  ROLLING: 'rolling',
  PLACING: 'placing',
  ANIMATING: 'animating',
  GAMEOVER: 'gameover',
}

export const MODES = {
  LOCAL: 'local',
  ONLINE: 'online',
  BOT: 'bot',
}

/**
 * Score for a column: for each group of identical dice,
 *   group_score = (sum of their values) × count
 *              = (value × count) × count
 *              = value × count²
 *
 * Examples with value=3:
 *   1 die  → 3 × 1 = 3
 *   2 dice → (3+3) × 2 = 12
 *   3 dice → (3+3+3) × 3 = 27
 */
export function calcColumnScore(column) {
  const counts = {}
  for (const val of column) {
    if (val !== null) counts[val] = (counts[val] ?? 0) + 1
  }
  let score = 0
  for (const [val, cnt] of Object.entries(counts)) {
    score += Number(val) * cnt * cnt
  }
  return score
}

export function calcAllColumnScores(board) {
  return board.map(col => calcColumnScore(col))
}

export function calcTotalScore(board) {
  return calcAllColumnScores(board).reduce((a, b) => a + b, 0)
}

export function isBoardFull(board) {
  return board.every(col => col.every(slot => slot !== null))
}

export function isColumnFull(column) {
  return column.every(slot => slot !== null)
}

/**
 * Place a die in the first empty slot of a column (bottom-up).
 * Returns the new column array or null if column is full.
 */
export function placeInColumn(column, value) {
  const idx = column.findIndex(slot => slot === null)
  if (idx === -1) return null
  const next = [...column]
  next[idx] = value
  return next
}

/**
 * Remove all dice of a given value from a column.
 * Returns { newColumn, destroyedPositions }.
 * NOTE: newColumn may contain null gaps — call compactColumn afterwards.
 */
export function destroyFromColumn(column, value) {
  const destroyedPositions = []
  const newColumn = column.map((slot, i) => {
    if (slot === value) {
      destroyedPositions.push(i)
      return null
    }
    return slot
  })
  return { newColumn, destroyedPositions }
}

/**
 * Compact a column so all non-null values are at the lowest indices
 * (closest to the centre dividing line), preserving their order.
 * [3, null, 5] → [3, 5, null]
 */
export function compactColumn(column) {
  const filled = column.filter(v => v !== null)
  while (filled.length < SLOTS) filled.push(null)
  return filled
}
