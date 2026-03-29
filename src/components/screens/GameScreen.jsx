import { useEffect, useRef, useState } from 'react'
import { PlayerPanel } from '@/components/game/PlayerPanel.jsx'
import { InfoModal, InfoButton } from '@/components/ui/InfoModal.jsx'
import { SettingsPanel } from '@/components/ui/SettingsPanel.jsx'
import { useThreeScene } from '@/hooks/useThreeScene.js'
import { useBotPlayer } from '@/hooks/useBotPlayer.js'
import { PHASES } from '@/game/constants.js'
import { audioEngine } from '@/audio/AudioEngine.js'
import { t } from '@/i18n/index.js'
import styles from './GameScreen.module.css'

export function GameScreen({ state, onRoll, onPlace, onAnimationDone, onMenu, playerIndex = 0 }) {
  const {
    phase, currentPlayer, boards, scores, columnScores,
    currentRoll, playerNames, lastDestroyed, mode,
  } = state

  const isMyTurn   = mode !== 'online' || currentPlayer === playerIndex
  const guardedOnRoll  = isMyTurn ? onRoll  : () => {}
  const guardedOnPlace = isMyTurn ? onPlace : () => {}

  const canvasRef  = useRef(null)
  const [showInfo,     setShowInfo]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const sceneRef = useThreeScene(canvasRef, boards, { phase, currentPlayer, onPlace: guardedOnPlace }, lastDestroyed)
  useBotPlayer(state, onRoll, onPlace)

  // Space bar → roll
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      if (mode === 'bot' && currentPlayer === 1) return
      if (!isMyTurn) return
      if (phase === PHASES.ROLLING) { e.preventDefault(); onRoll() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, currentPlayer, mode, isMyTurn, onRoll])

  // Destruction: sound + shake
  const prevDestroyedRef = useRef([])
  useEffect(() => {
    if (lastDestroyed.length > 0 && lastDestroyed !== prevDestroyedRef.current) {
      audioEngine.playDestroy()
      audioEngine.onDiceDestroyed()
      sceneRef.current?.triggerShake(0.05, 200)
    }
    prevDestroyedRef.current = lastDestroyed
  }, [lastDestroyed, sceneRef])

  // Score change → music reactivity
  const prevScoresRef = useRef(scores)
  useEffect(() => {
    if (prevScoresRef.current !== scores) {
      audioEngine.onScoreChange(scores[0], scores[1])
      prevScoresRef.current = scores
    }
  }, [scores])

  // Roll sound
  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    if (prevPhaseRef.current === PHASES.ROLLING && phase === PHASES.PLACING) {
      audioEngine.playRoll()
    }
    prevPhaseRef.current = phase
  }, [phase])

  // Place sound + combo detection
  const prevBoardsRef = useRef(boards)
  useEffect(() => {
    if (prevBoardsRef.current !== boards) {
      for (let p = 0; p < 2; p++) {
        for (let c = 0; c < 3; c++) {
          const col    = boards[p][c]
          const prev   = prevBoardsRef.current[p][c]
          const counts = {}
          for (const v of col) { if (v !== null) counts[v] = (counts[v] || 0) + 1 }
          const prevCounts = {}
          for (const v of prev) { if (v !== null) prevCounts[v] = (prevCounts[v] || 0) + 1 }
          for (const [val, cnt] of Object.entries(counts)) {
            if (cnt >= 2 && (prevCounts[val] ?? 0) < cnt) {
              audioEngine.onComboCreated(cnt)
            }
          }
        }
      }
      prevBoardsRef.current = boards
    }
  }, [boards])

  // Animation advance
  useEffect(() => {
    if (phase === PHASES.ANIMATING) {
      const id = setTimeout(onAnimationDone, 700)
      return () => clearTimeout(id)
    }
  }, [phase, onAnimationDone])

  const isBotTurn = mode === 'bot' && currentPlayer === 1
  const p0Color   = 'var(--p1-color)'
  const p1Color   = 'var(--p2-color)'

  return (
    <div className={styles.screen}>
      <div className={styles.main}>
        {/* Left panel — player 0 */}
        <PlayerPanel
          playerIndex={0}
          playerName={playerNames[0]}
          totalScore={scores[0]}
          columnScores={columnScores[0]}
          isMyTurn={currentPlayer === 0}
          phase={phase}
          currentRoll={currentPlayer === 0 ? currentRoll : null}
          board={boards[0]}
          onRoll={guardedOnRoll}
          onPlace={guardedOnPlace}
        />

        {/* Canvas — turn overlay floats above it */}
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} />

          <div
            className={styles.turnOverlay}
            style={{ '--tc': currentPlayer === 0 ? p0Color : p1Color }}
          >
            <span>
              {t('game.turn_of')} <strong>{playerNames[currentPlayer]}</strong>
              {isBotTurn && <em className={styles.botThinking}> — {t('game.bot_thinking')}</em>}
            </span>
            {!isBotTurn && phase === PHASES.ROLLING && isMyTurn && (
              <span className={styles.spaceHint}>{t('game.space_hint')}</span>
            )}
          </div>

          <div className={styles.controls}>
            <InfoButton onClick={() => setShowInfo(true)} />
            <button
              className={styles.settingsBtn}
              onClick={() => setShowSettings(s => !s)}
              aria-label="Settings"
            >⚙</button>
            <button className={styles.menuBtn} onClick={onMenu}>Menú</button>
          </div>
        </div>

        {/* Right panel — player 1 */}
        <PlayerPanel
          playerIndex={1}
          playerName={playerNames[1]}
          totalScore={scores[1]}
          columnScores={columnScores[1]}
          isMyTurn={currentPlayer === 1}
          phase={phase}
          currentRoll={currentPlayer === 1 ? currentRoll : null}
          board={boards[1]}
          onRoll={guardedOnRoll}
          onPlace={guardedOnPlace}
          isBot={mode === 'bot'}
        />
      </div>

      {showInfo     && <InfoModal     onClose={() => setShowInfo(false)} />}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          sceneManager={sceneRef.current}
        />
      )}
    </div>
  )
}
