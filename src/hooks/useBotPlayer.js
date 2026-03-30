import { useEffect } from 'react'
import { PHASES } from '@/game/constants.js'
import { botStrategy } from '@/game/botStrategy.js'
import { settings } from '@/settings/store.js'

// Think-time per difficulty.
// Easy:   fast and impulsive — feels like it barely thinks.
// Normal: a natural pause — the original timing.
// Hard:   deliberate — takes a moment before committing.
const DELAYS = {
  easy:   { roll: 500,  place: 380 },
  normal: { roll: 950,  place: 750 },
  hard:   { roll: 1200, place: 900 },
}

/**
 * When mode === 'bot' and it is player 1's turn, automatically
 * roll and place using the strategy matching settings.botDifficulty.
 *
 * @param {object}   state     full game state
 * @param {Function} rollDice  stable dispatch wrapper
 * @param {Function} placeDice stable dispatch wrapper
 */
export function useBotPlayer(state, rollDice, placeDice) {
  const { phase, currentPlayer, boards, currentRoll, mode } = state
  const isBotTurn  = mode === 'bot' && currentPlayer === 1
  const difficulty = settings.botDifficulty ?? 'normal'
  const delays     = DELAYS[difficulty] ?? DELAYS.normal

  // Rolling phase — bot waits, then rolls
  useEffect(() => {
    if (!isBotTurn || phase !== PHASES.ROLLING) return
    const id = setTimeout(rollDice, delays.roll)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, phase])

  // Placing phase — bot evaluates using the selected strategy, then places
  useEffect(() => {
    if (!isBotTurn || phase !== PHASES.PLACING || currentRoll === null) return
    const col = botStrategy(boards, currentPlayer, currentRoll, difficulty)
    const id  = setTimeout(() => placeDice(col), delays.place)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, phase, currentRoll])
}
