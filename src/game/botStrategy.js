import {
  isColumnFull,
  placeInColumn,
  destroyFromColumn,
  compactColumn,
  calcTotalScore,
} from './constants.js'

/**
 * Simulate placing `roll` in `col` for `player`, including destruction + compaction.
 * Returns a new boards array (does not mutate the original).
 */
function simulate(boards, player, col, roll) {
  const opponent = 1 - player
  const sim = [boards[0].map(c => [...c]), boards[1].map(c => [...c])]
  sim[player][col] = placeInColumn(sim[player][col], roll)
  const { newColumn } = destroyFromColumn(sim[opponent][col], roll)
  sim[opponent][col] = compactColumn(newColumn)
  return sim
}

/**
 * Greedy 1-ply bot: for each available column, evaluate
 *   score = (own total after) – (opponent total after)
 * and pick the column with the highest value.
 *
 * Tie-breaking: prefer columns that already contain dice equal to `roll`
 * (builds multiplier bonus), then the lowest column index.
 */
export function botStrategy(boards, player, roll) {
  const available = [0, 1, 2].filter(c => !isColumnFull(boards[player][c]))
  if (available.length === 0) return 0
  if (available.length === 1) return available[0]

  const opponent = 1 - player

  let best = { col: available[0], score: -Infinity }

  for (const col of available) {
    const sim = simulate(boards, player, col, roll)

    // Primary: maximise own advantage after the move
    const advantage = calcTotalScore(sim[player]) - calcTotalScore(sim[opponent])

    // Tie-break bonus: already have same-value dice in this column → builds ×4/×9
    const sameCount = boards[player][col].filter(v => v === roll).length
    const bonus = sameCount * 0.5   // small fractional offset, never overrides advantage

    const total = advantage + bonus
    if (total > best.score) best = { col, score: total }
  }

  return best.col
}
