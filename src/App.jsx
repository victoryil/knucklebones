import { useState, useCallback } from 'react'
import { StartScreen } from '@/components/screens/StartScreen.jsx'
import { GameScreen } from '@/components/screens/GameScreen.jsx'
import { GameOverScreen } from '@/components/screens/GameOverScreen.jsx'
import { useGameReducer } from '@/hooks/useGameReducer.js'
import { PHASES } from '@/game/constants.js'
import { setLocale as i18nSetLocale, getCurrentLocale } from '@/i18n/index.js'
import styles from './App.module.css'

const SCREENS = { START: 'start', GAME: 'game', GAMEOVER: 'gameover' }

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START)
  const [locale, setLocale] = useState(getCurrentLocale)

  const { state, startGame, rollDice, placeDice, animationDone, resetGame } = useGameReducer()

  const handleToggleLocale = useCallback(() => {
    const next = locale === 'es' ? 'en' : 'es'
    i18nSetLocale(next)
    setLocale(next)
  }, [locale])

  const handleStart = useCallback(({ playerNames, mode }) => {
    startGame(playerNames, mode)
    setScreen(SCREENS.GAME)
  }, [startGame])

  const handleMenu    = useCallback(() => setScreen(SCREENS.START), [])
  const handleRematch = useCallback(() => { resetGame(); setScreen(SCREENS.GAME) }, [resetGame])

  const currentScreen = state.phase === PHASES.GAMEOVER && screen === SCREENS.GAME
    ? SCREENS.GAMEOVER : screen

  return (
    <div key={locale} className={styles.app}>
      {currentScreen === SCREENS.START && (
        <StartScreen
          onStart={handleStart}
          locale={locale}
          onToggleLocale={handleToggleLocale}
        />
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
