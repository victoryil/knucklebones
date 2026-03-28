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
  const [screen, setScreen]       = useState(SCREENS.START)
  const [playerNames, setPlayerNames] = useState(['Jugador 1', 'Jugador 2'])
  const [locale, setLocale]       = useState(getCurrentLocale)

  const { state, rollDice, placeDice, animationDone, resetGame, setPlayerNames: dispatchNames } =
    useGameReducer(playerNames)

  const handleToggleLocale = useCallback(() => {
    const next = locale === 'es' ? 'en' : 'es'
    i18nSetLocale(next)   // update module variable first…
    setLocale(next)        // …then trigger React re-render
  }, [locale])

  const handleStart = useCallback(({ playerNames: names }) => {
    setPlayerNames(names)
    dispatchNames(names)
    resetGame()
    setScreen(SCREENS.GAME)
  }, [dispatchNames, resetGame])

  const handleMenu    = useCallback(() => setScreen(SCREENS.START), [])
  const handleRematch = useCallback(() => { resetGame(); setScreen(SCREENS.GAME) }, [resetGame])

  const currentScreen = state.phase === PHASES.GAMEOVER && screen === SCREENS.GAME
    ? SCREENS.GAMEOVER : screen

  return (
    // key={locale} forces full re-render of child tree when language switches
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
