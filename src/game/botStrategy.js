import {
  isColumnFull,
  placeInColumn,
  destroyFromColumn,
  compactColumn,
  calcTotalScore,
  calcColumnScore,
} from './constants.js'

// ── Simulation helper ─────────────────────────────────────────────────────
/**
 * Simulate placing `roll` in `col` for `player`.
 * Returns a new boards array without mutating the original.
 */
function simulate(boards, player, col, roll) {
  const opp = 1 - player
  const sim = [boards[0].map(c => [...c]), boards[1].map(c => [...c])]
  sim[player][col] = placeInColumn(sim[player][col], roll)
  const { newColumn } = destroyFromColumn(sim[opp][col], roll)
  sim[opp][col] = compactColumn(newColumn)
  return sim
}

/** Available (non-full) columns for a player. */
function available(boards, player) {
  return [0, 1, 2].filter(c => !isColumnFull(boards[player][c]))
}

// ── Shared evaluation metric ──────────────────────────────────────────────
/**
 * Score differential from `player`'s perspective after a simulated board.
 */
function advantage(sim, player) {
  return calcTotalScore(sim[player]) - calcTotalScore(sim[1 - player])
}

// ─────────────────────────────────────────────────────────────────────────
// EASY
// The easy bot makes two types of mistakes:
//
//   30% of the time — picks a completely random column (doesn't think at all).
//
//   70% of the time — uses a simplified greedy that only counts its OWN
//   immediate score gain, ignoring:
//     • destruction value (opponent's dice being removed)
//     • multiplier potential (not building ×4/×9 combos on purpose)
//
// This models a new player who doesn't fully understand the mechanic.
// ─────────────────────────────────────────────────────────────────────────
export function botStrategyEasy(boards, player, roll) {
  const cols = available(boards, player)
  if (cols.length === 0) return 0
  if (cols.length === 1) return cols[0]

  // 30% pure random mistake
  if (Math.random() < 0.30) {
    return cols[Math.floor(Math.random() * cols.length)]
  }

  // Simplified greedy: only own score gain, no destruction awareness
  let best = { col: cols[0], score: -Infinity }
  for (const col of cols) {
    const ownBefore = calcTotalScore(boards[player])

    // Simulate only own board (do NOT factor in opponent destruction)
    const ownSim = boards[player].map(c => [...c])
    ownSim[col] = placeInColumn(ownSim[col], roll)
    const ownGain = calcTotalScore(ownSim) - ownBefore

    if (ownGain > best.score) best = { col, score: ownGain }
  }
  return best.col
}

// ─────────────────────────────────────────────────────────────────────────
// NORMAL (original greedy)
// 1-ply: for each available column, evaluates
//   advantage = own_total_after − opponent_total_after
// Tie-break: prefer columns that already hold dice equal to `roll`
// (grows existing multiplier bonuses).
// ─────────────────────────────────────────────────────────────────────────
export function botStrategyNormal(boards, player, roll) {
  const cols = available(boards, player)
  if (cols.length === 0) return 0
  if (cols.length === 1) return cols[0]

  let best = { col: cols[0], score: -Infinity }

  for (const col of cols) {
    const sim    = simulate(boards, player, col, roll)
    const adv    = advantage(sim, player)
    // Small tie-break: reward building an existing partial combo
    const same   = boards[player][col].filter(v => v === roll).length
    const bonus  = same * 0.5
    const total  = adv + bonus
    if (total > best.score) best = { col, score: total }
  }

  return best.col
}

// ─────────────────────────────────────────────────────────────────────────
// HARD — 2-ply expected minimax + threat awareness
//
// For every column the bot could place in:
//   1. Simulate bot's placement.
//   2. For each of the 6 equally-likely die values the player could roll next,
//      find the player's best column (1-ply greedy from the player's perspective).
//   3. Score = average advantage across all 6 responses.
//      (Expected value over a uniform die roll.)
//
// Additional weights on top of the expected-value score:
//   • Multiplier bonus  — reward completing/extending bot's own ×4/×9 combos.
//   • Threat disruption — extra weight when the placement destroys 2+ dice of
//     the same value from an opponent column (killing a developing ×4 or ×9).
//     The simulation already captures this numerically, but a small bonus
//     makes the bot more aggressively pursue these high-value destroys when
//     the expected-value difference is small.
// ─────────────────────────────────────────────────────────────────────────

/** Best column for `player` given `roll`, using 1-ply greedy (used inside minimax). */
function greedyCol(boards, player, roll) {
  const cols = available(boards, player)
  if (cols.length === 0) return -1   // board full
  if (cols.length === 1) return cols[0]

  let best = { col: cols[0], score: -Infinity }
  for (const col of cols) {
    const sim = simulate(boards, player, col, roll)
    const adv = advantage(sim, player)
    if (adv > best.score) best = { col, score: adv }
  }
  return best.col
}

export function botStrategyHard(boards, player, roll) {
  const cols = available(boards, player)
  if (cols.length === 0) return 0
  if (cols.length === 1) return cols[0]

  const opp = 1 - player

  let best = { col: cols[0], score: -Infinity }

  for (const col of cols) {
    const simAfterBot = simulate(boards, player, col, roll)

    // ── Expected value over opponent's next roll ──────────────────────────
    let expectedAdv = 0
    const oppCols = available(simAfterBot, opp)

    if (oppCols.length === 0) {
      // Opponent's board is full — no response possible, just use raw advantage
      expectedAdv = advantage(simAfterBot, player)
    } else {
      for (let oppRoll = 1; oppRoll <= 6; oppRoll++) {
        const oppCol    = greedyCol(simAfterBot, opp, oppRoll)
        const simFinal  = simulate(simAfterBot, opp, oppCol, oppRoll)
        expectedAdv    += advantage(simFinal, player)
      }
      expectedAdv /= 6
    }

    // ── Multiplier bonus: growing bot's own combos ────────────────────────
    // Count how many dice equal to `roll` are already in this column.
    // 1 existing → placing makes ×4; 2 existing → placing makes ×9.
    const sameInCol  = boards[player][col].filter(v => v === roll).length
    const multiplierBonus = sameInCol === 2 ? 4.0    // completing ×9
                          : sameInCol === 1 ? 2.0    // completing ×4
                          : 0

    // ── Threat disruption bonus: destroying a developing opponent combo ───
    // Count how many of opponent's dice in this column equal `roll`.
    // If ≥ 2, the bot is killing a ×4 or ×9 in the making — highly valuable.
    const oppSame    = boards[opp][col].filter(v => v === roll).length
    const threatBonus = oppSame >= 2 ? 3.5    // killing a ×4/×9 combo
                      : oppSame === 1 ? 0.5   // small disruption
                      : 0

    const total = expectedAdv + multiplierBonus + threatBonus
    if (total > best.score) best = { col, score: total }
  }

  return best.col
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point — dispatches to the right strategy
// ─────────────────────────────────────────────────────────────────────────
export function botStrategy(boards, player, roll, difficulty = 'normal') {
  switch (difficulty) {
    case 'easy': return botStrategyEasy(boards, player, roll)
    case 'hard': return botStrategyHard(boards, player, roll)
    default:     return botStrategyNormal(boards, player, roll)
  }
}
