import { useReducer, useCallback, useState, useRef, useEffect } from 'react'
import { gameReducer, getInitialState } from '@/game/gameReducer.js'
import { sendMove } from '@/network/networkInterface.js'
import { useOnlineGame } from './useOnlineGame.js'

export function useGameReducer() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    getInitialState(),
  )
  const [networkError, setNetworkError] = useState(false)

  // Keep a ref to current state so the sync handler always sends the latest
  // snapshot without needing to be re-registered on every state change.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const startGame = useCallback((playerNames, mode) => {
    dispatch({ type: 'START_GAME', playerNames, mode })
  }, [])

  const rollDice = useCallback(() => {
    const value = Math.floor(Math.random() * 6) + 1
    dispatch({ type: 'ROLL_DICE', value })
    if (stateRef.current.mode === 'online') sendMove({ type: 'ROLL', value })
  }, [])

  const placeDice = useCallback((col) => {
    dispatch({ type: 'PLACE_DICE', col })
    if (stateRef.current.mode === 'online') sendMove({ type: 'PLACE', col })
  }, [])

  const animationDone = useCallback(() => {
    dispatch({ type: 'ANIMATION_DONE' })
  }, [])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' })
  }, [])

  const clearNetworkError = useCallback(() => setNetworkError(false), [])
  const handleNetworkError = useCallback(() => setNetworkError(true), [])

  // When the opponent requests a state sync (after reconnect), send full state.
  const handleSyncRequest = useCallback(() => {
    sendMove({ type: 'STATE_SYNC', state: stateRef.current })
  }, [])

  useOnlineGame(state.mode, dispatch, handleNetworkError, handleSyncRequest)

  return { state, startGame, rollDice, placeDice, animationDone, resetGame, networkError, clearNetworkError }
}
