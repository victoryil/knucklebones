import { useEffect, useRef, useState, useCallback } from 'react'
import { PlayerPanel } from '@/components/game/PlayerPanel.jsx'
import { Board2D } from '@/components/game/Board2D.jsx'
import { InfoModal, InfoButton } from '@/components/ui/InfoModal.jsx'
import { SettingsPanel } from '@/components/ui/SettingsPanel.jsx'
import { useThreeScene } from '@/hooks/useThreeScene.js'
import { useBotPlayer } from '@/hooks/useBotPlayer.js'
import { useGamepad } from '@/hooks/useGamepad.js'
import { PHASES, isColumnFull } from '@/game/constants.js'
import { audioEngine } from '@/audio/AudioEngine.js'
import { t } from '@/i18n/index.js'
import styles from './GameScreen.module.css'

export function GameScreen({
  state, onRoll, onPlace, onAnimationDone, onMenu,
  playerIndex = 0,
  is2D = false, force2D = false, onToggle2D = null,
}) {
  const {
    phase, currentPlayer, boards, scores, columnScores,
    currentRoll, playerNames, lastDestroyed, mode,
  } = state

  // ── Human-turn guard ──────────────────────────────────────────────────────
  // In bot mode the human is always player 0. Without this guard, isHumanTurn
  // would always be true because mode !== 'online' never fails.
  const isHumanTurn = mode === 'bot'
    ? currentPlayer === 0
    : (mode !== 'online' || currentPlayer === playerIndex)

  const guardedOnRoll  = isHumanTurn ? onRoll  : () => {}
  const guardedOnPlace = isHumanTurn ? onPlace : () => {}

  // ── Gamepad column selection ───────────────────────────────────────────────
  // selectedCol tracks which column the controller cursor is on (0-2).
  // Resets to the leftmost non-full column each time the placing phase starts.
  const [selectedCol, setSelectedCol] = useState(0)

  useEffect(() => {
    if (phase === PHASES.PLACING && isHumanTurn) {
      // Start on first non-full column
      const first = boards[currentPlayer].findIndex(col => !isColumnFull(col))
      setSelectedCol(first >= 0 ? first : 0)
    }
  }, [phase])   // eslint-disable-line react-hooks/exhaustive-deps

  const canvasRef      = useRef(null)
  const [showInfo,     setShowInfo]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Pass a non-placing phase to the scene when it's not the human's turn so
  // the 3D raycaster stays inactive (no highlights, no click processing).
  const scenePhase = isHumanTurn ? phase : PHASES.ROLLING
  const sceneRef = useThreeScene(
    canvasRef, boards,
    { phase: scenePhase, currentPlayer, onPlace: guardedOnPlace },
    lastDestroyed,
  )

  useBotPlayer(state, onRoll, onPlace)   // bot always uses raw handlers

  // ── Gamepad ───────────────────────────────────────────────────────────────
  const gpColPrev = useCallback(() => {
    setSelectedCol(c => {
      // Skip full columns when navigating
      for (let i = c - 1; i >= 0; i--) {
        if (!isColumnFull(boards[currentPlayer][i])) return i
      }
      return c
    })
  }, [boards, currentPlayer])

  const gpColNext = useCallback(() => {
    setSelectedCol(c => {
      for (let i = c + 1; i <= 2; i++) {
        if (!isColumnFull(boards[currentPlayer][i])) return i
      }
      return c
    })
  }, [boards, currentPlayer])

  const gpRoll = useCallback(() => {
    if (phase === PHASES.ROLLING && isHumanTurn) guardedOnRoll()
  }, [phase, isHumanTurn, guardedOnRoll])

  const gpConfirm = useCallback(() => {
    if (phase === PHASES.PLACING && isHumanTurn) {
      const col = selectedCol
      if (!isColumnFull(boards[currentPlayer][col])) guardedOnPlace(col)
    }
  }, [phase, isHumanTurn, selectedCol, boards, currentPlayer, guardedOnPlace])

  useGamepad(
    { onRoll: gpRoll, onConfirm: gpConfirm, onColPrev: gpColPrev, onColNext: gpColNext },
    isHumanTurn,
  )

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || !isHumanTurn) return
      if (e.code === 'Space' && phase === PHASES.ROLLING) {
        e.preventDefault(); onRoll()
      }
      if (e.code === 'ArrowLeft'  && phase === PHASES.PLACING) gpColPrev()
      if (e.code === 'ArrowRight' && phase === PHASES.PLACING) gpColNext()
      if ((e.code === 'Enter' || e.code === 'Space') && phase === PHASES.PLACING) {
        e.preventDefault(); gpConfirm()
      }
      if (e.code === 'Digit1' && phase === PHASES.PLACING) { setSelectedCol(0); gpConfirm() }
      if (e.code === 'Digit2' && phase === PHASES.PLACING) { setSelectedCol(1); gpConfirm() }
      if (e.code === 'Digit3' && phase === PHASES.PLACING) { setSelectedCol(2); gpConfirm() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, isHumanTurn, onRoll, gpColPrev, gpColNext, gpConfirm])

  // ── Audio effects ─────────────────────────────────────────────────────────
  const prevDestroyedRef = useRef([])
  useEffect(() => {
    if (lastDestroyed.length > 0 && lastDestroyed !== prevDestroyedRef.current) {
      audioEngine.playDestroy()
      audioEngine.onDiceDestroyed()
      sceneRef.current?.triggerShake(0.05, 200)
    }
    prevDestroyedRef.current = lastDestroyed
  }, [lastDestroyed, sceneRef])

  const prevScoresRef = useRef(scores)
  useEffect(() => {
    if (prevScoresRef.current !== scores) {
      audioEngine.onScoreChange(scores[0], scores[1])
      prevScoresRef.current = scores
    }
  }, [scores])

  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    if (prevPhaseRef.current === PHASES.ROLLING && phase === PHASES.PLACING) {
      audioEngine.playRoll()
    }
    prevPhaseRef.current = phase
  }, [phase])

  const prevBoardsRef = useRef(boards)
  useEffect(() => {
    if (prevBoardsRef.current !== boards) {
      for (let p = 0; p < 2; p++) {
        for (let c = 0; c < 3; c++) {
          const col = boards[p][c]; const prev = prevBoardsRef.current[p][c]
          const counts = {}; for (const v of col) { if (v !== null) counts[v] = (counts[v] || 0) + 1 }
          const prevCounts = {}; for (const v of prev) { if (v !== null) prevCounts[v] = (prevCounts[v] || 0) + 1 }
          for (const [val, cnt] of Object.entries(counts)) {
            if (cnt >= 2 && (prevCounts[val] ?? 0) < cnt) audioEngine.onComboCreated(cnt)
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

  // Column indicator shown in the 3D overlay during placing phase
  const showColIndicator = !is2D && isHumanTurn && phase === PHASES.PLACING

  return (
    <div className={styles.screen}>
      <div className={styles.main}>
        {is2D ? (
          // ── 2D MODE ──────────────────────────────────────────────────────
          <div className={styles.board2DWrap}>
            <Board2D
              state={state}
              onRoll={guardedOnRoll}
              onPlace={guardedOnPlace}
              mode={mode}
              selectedCol={selectedCol}
            />
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
        ) : (
          // ── 3D MODE ──────────────────────────────────────────────────────
          <>
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
                {!isBotTurn && phase === PHASES.ROLLING && isHumanTurn && (
                  <span className={styles.spaceHint}>{t('game.space_hint')}</span>
                )}
              </div>

              {/* Gamepad column selector — visible only when controller is placing */}
              {showColIndicator && (
                <div className={styles.colIndicator}>
                  {[0, 1, 2].map(ci => (
                    <button
                      key={ci}
                      className={`${styles.colIndBtn} ${ci === selectedCol ? styles.colIndActive : ''} ${isColumnFull(boards[currentPlayer][ci]) ? styles.colIndFull : ''}`}
                      onClick={() => { setSelectedCol(ci); guardedOnPlace(ci) }}
                      disabled={isColumnFull(boards[currentPlayer][ci])}
                      aria-label={`${t('column.aria')} ${ci + 1}`}
                    >
                      {ci + 1}
                    </button>
                  ))}
                </div>
              )}

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
          </>
        )}
      </div>

      {showInfo     && <InfoModal onClose={() => setShowInfo(false)} />}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          sceneManager={sceneRef.current}
          force2D={force2D}
          onToggle2D={onToggle2D}
        />
      )}
    </div>
  )
}
