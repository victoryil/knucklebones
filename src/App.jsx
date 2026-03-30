import { useState, useCallback, useEffect } from 'react'
import { StartScreen } from '@/components/screens/StartScreen.jsx'
import { GameScreen } from '@/components/screens/GameScreen.jsx'
import { GameOverScreen } from '@/components/screens/GameOverScreen.jsx'
import { useGameReducer } from '@/hooks/useGameReducer.js'
import { audioEngine } from '@/audio/AudioEngine.js'
import { disconnect } from '@/network/networkInterface.js'
import { PHASES } from '@/game/constants.js'
import { setLocale as i18nSetLocale, getCurrentLocale } from '@/i18n/index.js'
import styles from './App.module.css'

const SCREENS = { START: 'start', GAME: 'game', GAMEOVER: 'gameover' }

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START)
  const [locale, setLocale] = useState(getCurrentLocale)
  const [playerIndex, setPlayerIndex] = useState(0)

  // ── 2D mode ──────────────────────────────────────────────────────────────
  // force2D: user preference stored in localStorage
  // autoIs2D: triggered automatically when viewport < 768px
  // is2D: either condition → switch to 2D
  const [force2D, setForce2D] = useState(
    () => localStorage.getItem('knucklebones-force2d') === 'true',
  )
  const [autoIs2D, setAutoIs2D] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const check = () => setAutoIs2D(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const is2D = autoIs2D || force2D

  const handleToggle2D = useCallback((value) => {
    setForce2D(value)
    localStorage.setItem('knucklebones-force2d', value)
  }, [])

  const { state, startGame, rollDice, placeDice, animationDone, resetGame, networkError, clearNetworkError } = useGameReducer()

  // Initialize AudioEngine on first user interaction (browser autoplay policy)
  useEffect(() => {
    const init = () => { audioEngine.init(); document.removeEventListener('click', init) }
    document.addEventListener('click', init)
    return () => document.removeEventListener('click', init)
  }, [])

  const handleToggleLocale = useCallback(() => {
    const next = locale === 'es' ? 'en' : 'es'
    i18nSetLocale(next)
    setLocale(next)
  }, [locale])

  const handleStart = useCallback(({ playerNames, mode, playerIndex: pi = 0 }) => {
    setPlayerIndex(pi)
    startGame(playerNames, mode)
    setScreen(SCREENS.GAME)
  }, [startGame])

  const handleMenu = useCallback(() => {
    disconnect()
    setScreen(SCREENS.START)
  }, [])

  const handleRematch = useCallback(() => { resetGame(); setScreen(SCREENS.GAME) }, [resetGame])

  // Network disconnect: go back to menu
  useEffect(() => {
    if (networkError) {
      clearNetworkError()
      resetGame()
      setScreen(SCREENS.START)
    }
  }, [networkError, clearNetworkError, resetGame])

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
        // key={is2D} forces a clean remount when switching modes,
        // which disposes the WebGL context and SceneManager correctly.
        <GameScreen
          key={is2D ? '2d' : '3d'}
          state={state}
          onRoll={rollDice}
          onPlace={placeDice}
          onAnimationDone={animationDone}
          onMenu={handleMenu}
          playerIndex={playerIndex}
          is2D={is2D}
          force2D={force2D}
          onToggle2D={handleToggle2D}
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
