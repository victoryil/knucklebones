import { useReducer, useCallback, useState } from 'react'
import { gameReducer, getInitialState } from '@/game/gameReducer.js'
import { sendMove } from '@/network/networkInterface.js'
import { useOnlineGame } from './useOnlineGame.js'

export function useGameReducer() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    getInitialState(),
  )
  const [networkError, setNetworkError] = useState(false)

  const startGame = useCallback((playerNames, mode) => {
    dispatch({ type: 'START_GAME', playerNames, mode })
  }, [])

  const rollDice = useCallback(() => {
    const value = Math.floor(Math.random() * 6) + 1
    dispatch({ type: 'ROLL_DICE', value })
    if (state.mode === 'online') sendMove({ type: 'ROLL', value })
  }, [state.mode])

  const placeDice = useCallback((col) => {
    dispatch({ type: 'PLACE_DICE', col })
    if (state.mode === 'online') sendMove({ type: 'PLACE', col })
  }, [state.mode])

  const animationDone = useCallback(() => {
    dispatch({ type: 'ANIMATION_DONE' })
  }, [])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' })
  }, [])

  const clearNetworkError = useCallback(() => setNetworkError(false), [])

  const handleNetworkError = useCallback(() => setNetworkError(true), [])

  useOnlineGame(state.mode, dispatch, handleNetworkError)

  return { state, startGame, rollDice, placeDice, animationDone, resetGame, networkError, clearNetworkError }
}
