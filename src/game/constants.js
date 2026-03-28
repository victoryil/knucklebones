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

/** Score for a column: sum over each value group of (value × count²) */
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
