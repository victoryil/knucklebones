import { useReducer, useCallback } from 'react'
import { gameReducer, getInitialState } from '@/game/gameReducer.js'
import { PHASES } from '@/game/constants.js'

export function useGameReducer(playerNames) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    getInitialState(playerNames),
  )

  const rollDice = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' })
  }, [])

  const placeDice = useCallback((col) => {
    dispatch({ type: 'PLACE_DICE', col })
  }, [])

  const animationDone = useCallback(() => {
    dispatch({ type: 'ANIMATION_DONE' })
  }, [])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' })
  }, [])

  const setPlayerNames = useCallback((names) => {
    dispatch({ type: 'SET_PLAYER_NAMES', names })
  }, [])

  return { state, rollDice, placeDice, animationDone, resetGame, setPlayerNames }
}
