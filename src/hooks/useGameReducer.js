import { useReducer, useCallback } from 'react'
import { gameReducer, getInitialState } from '@/game/gameReducer.js'

export function useGameReducer() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    getInitialState(),
  )

  const startGame = useCallback((playerNames, mode) => {
    dispatch({ type: 'START_GAME', playerNames, mode })
  }, [])

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

  return { state, startGame, rollDice, placeDice, animationDone, resetGame }
}
