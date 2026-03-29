import { useEffect } from 'react'
import { PHASES } from '@/game/constants.js'
import { botStrategy } from '@/game/botStrategy.js'

const ROLL_DELAY  = 950   // ms before bot "decides" to roll
const PLACE_DELAY = 750   // ms before bot places the die

/**
 * When mode === 'bot' and it is player 1's turn, automatically
 * roll and place using the greedy strategy.
 *
 * @param {object}   state     full game state
 * @param {Function} rollDice  stable dispatch wrapper
 * @param {Function} placeDice stable dispatch wrapper
 */
export function useBotPlayer(state, rollDice, placeDice) {
  const { phase, currentPlayer, boards, currentRoll, mode } = state
  const isBotTurn = mode === 'bot' && currentPlayer === 1

  // Rolling phase — bot decides to roll after a short pause
  useEffect(() => {
    if (!isBotTurn || phase !== PHASES.ROLLING) return
    const id = setTimeout(rollDice, ROLL_DELAY)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, phase])

  // Placing phase — bot evaluates and places the die
  useEffect(() => {
    if (!isBotTurn || phase !== PHASES.PLACING || currentRoll === null) return
    const col = botStrategy(boards, currentPlayer, currentRoll)
    const id  = setTimeout(() => placeDice(col), PLACE_DELAY)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, phase, currentRoll])
}
