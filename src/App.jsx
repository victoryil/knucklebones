import { useState, useCallback, useEffect, useRef } from 'react'
import { StartScreen } from '@/components/screens/StartScreen.jsx'
import { GameScreen } from '@/components/screens/GameScreen.jsx'
import { GameOverScreen } from '@/components/screens/GameOverScreen.jsx'
import { TutorialScreen } from '@/components/screens/TutorialScreen.jsx'
import { ReconnectOverlay } from '@/components/screens/ReconnectOverlay.jsx'
import { useGameReducer } from '@/hooks/useGameReducer.js'
import { audioEngine } from '@/audio/audioEngine.js'
import { disconnect, cancelReconnect, startReconnect, sendMove } from '@/network/networkInterface.js'
import { PHASES } from '@/game/constants.js'
import { setLocale as i18nSetLocale, getCurrentLocale } from '@/i18n/index.js'
import styles from './App.module.css'

const SCREENS = { START: 'start', GAME: 'game', GAMEOVER: 'gameover', TUTORIAL: 'tutorial' }

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START)
  const [locale, setLocale] = useState(getCurrentLocale)
  const [playerIndex, setPlayerIndex] = useState(0)

  // ── 2D mode ──────────────────────────────────────────────────────────────
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

  // Always-current state ref so reconnect callbacks avoid stale closures
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ── Reconnect state ───────────────────────────────────────────────────────
  const [reconnecting, setReconnecting]   = useState(false)
  const [reconnAttempt, setReconnAttempt] = useState(0)
  const RECONN_MAX = 5

  // Initialize AudioEngine on first user interaction (browser autoplay policy)
  useEffect(() => {
    const init = () => { audioEngine.init(); document.removeEventListener('click', init) }
    document.addEventListener('click', init)
    return () => document.removeEventListener('click', init)
  }, [])

  // Konami code easter egg: ↑↑↓↓←→←→BA
  useEffect(() => {
    const KONAMI = [
      'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
      'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
      'KeyB','KeyA',
    ]
    let seq = []
    const onKey = (e) => {
      seq.push(e.code)
      if (seq.length > KONAMI.length) seq.shift()
      if (seq.join(',') === KONAMI.join(',')) {
        document.body.classList.toggle('konami')
        seq = []
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    cancelReconnect()
    disconnect()
    setReconnecting(false)
    setScreen(SCREENS.START)
  }, [])

  const handleRematch = useCallback(() => { resetGame(); setScreen(SCREENS.GAME) }, [resetGame])

  // ── Network disconnect → try to reconnect, then fall back to menu ─────────
  useEffect(() => {
    if (!networkError) return
    clearNetworkError()

    // Only attempt reconnect when a game is in progress
    if (screen !== SCREENS.GAME || state.mode !== 'online') {
      resetGame()
      setScreen(SCREENS.START)
      return
    }

    setReconnecting(true)
    setReconnAttempt(0)

    startReconnect(
      // onSuccess — connection restored
      () => {
        setReconnecting(false)
        setReconnAttempt(0)
        if (playerIndex === 0) {
          // Host pushes full state proactively; small delay ensures the guest's
          // data handler is wired before the message arrives.
          setTimeout(() => sendMove({ type: 'STATE_SYNC', state: stateRef.current }), 200)
        } else {
          // Guest also requests sync as a fallback (handles host-initiated reconnect)
          setTimeout(() => sendMove({ type: 'STATE_SYNC_REQUEST' }), 100)
        }
      },
      // onAttempt — update counter
      (n) => setReconnAttempt(n),
      // onFail — give up, go to menu
      () => { setReconnecting(false); resetGame(); setScreen(SCREENS.START) },
      RECONN_MAX,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkError])

  const currentScreen = state.phase === PHASES.GAMEOVER && screen === SCREENS.GAME
    ? SCREENS.GAMEOVER : screen

  return (
    <div key={locale} className={styles.app}>
      {currentScreen === SCREENS.TUTORIAL && (
        <TutorialScreen
          onBack={() => setScreen(SCREENS.START)}
          onPlay={() => setScreen(SCREENS.START)}
        />
      )}
      {currentScreen === SCREENS.START && (
        <StartScreen
          onStart={handleStart}
          locale={locale}
          onToggleLocale={handleToggleLocale}
          force2D={force2D}
          onToggle2D={handleToggle2D}
          onTutorial={() => setScreen(SCREENS.TUTORIAL)}
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
          playerIndex={playerIndex}
        />
      )}

      {reconnecting && (
        <ReconnectOverlay
          attempt={reconnAttempt}
          maxAttempts={RECONN_MAX}
          onAbandon={handleMenu}
        />
      )}
    </div>
  )
}
