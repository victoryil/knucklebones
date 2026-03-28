import { useState, useCallback } from 'react'
import { StartScreen } from '@/components/screens/StartScreen.jsx'
import { GameScreen } from '@/components/screens/GameScreen.jsx'
import { GameOverScreen } from '@/components/screens/GameOverScreen.jsx'
import { useGameReducer } from '@/hooks/useGameReducer.js'
import { PHASES } from '@/game/constants.js'
import styles from './App.module.css'

const SCREENS = {
  START: 'start',
  GAME: 'game',
  GAMEOVER: 'gameover',
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START)
  const [playerNames, setPlayerNames] = useState(['Jugador 1', 'Jugador 2'])

  const { state, rollDice, placeDice, animationDone, resetGame, setPlayerNames: dispatchNames } =
    useGameReducer(playerNames)

  const handleStart = useCallback(({ playerNames: names }) => {
    setPlayerNames(names)
    dispatchNames(names)
    resetGame()
    setScreen(SCREENS.GAME)
  }, [dispatchNames, resetGame])

  const handleMenu = useCallback(() => {
    setScreen(SCREENS.START)
  }, [])

  const handleRematch = useCallback(() => {
    resetGame()
    setScreen(SCREENS.GAME)
  }, [resetGame])

  // Auto-navigate to game over when phase changes
  const currentScreen = state.phase === PHASES.GAMEOVER && screen === SCREENS.GAME
    ? SCREENS.GAMEOVER
    : screen

  return (
    <div className={styles.app}>
      {currentScreen === SCREENS.START && (
        <StartScreen onStart={handleStart} />
      )}
      {currentScreen === SCREENS.GAME && (
        <GameScreen
          state={state}
          onRoll={rollDice}
          onPlace={placeDice}
          onAnimationDone={animationDone}
          onMenu={handleMenu}
        />
      )}
      {currentScreen === SCREENS.GAMEOVER && (
        <GameOverScreen
          state={state}
          onRematch={handleRematch}
          onMenu={handleMenu}
        />
      )}
    </div>
  )
}
