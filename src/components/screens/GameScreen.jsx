import { useEffect, useRef, useState } from 'react'
import { PlayerPanel } from '@/components/game/PlayerPanel.jsx'
import { InfoModal, InfoButton } from '@/components/ui/InfoModal.jsx'
import { useThreeScene } from '@/hooks/useThreeScene.js'
import { useBotPlayer } from '@/hooks/useBotPlayer.js'
import { PHASES } from '@/game/constants.js'
import { playDestruction } from '@/audio/soundManager.js'
import { t } from '@/i18n/index.js'
import styles from './GameScreen.module.css'

export function GameScreen({ state, onRoll, onPlace, onAnimationDone, onMenu, playerIndex = 0 }) {
  const {
    phase, currentPlayer, boards, scores, columnScores,
    currentRoll, playerNames, lastDestroyed, mode,
  } = state

  const isMyTurn = mode !== 'online' || currentPlayer === playerIndex
  const guardedOnRoll  = isMyTurn ? onRoll  : () => {}
  const guardedOnPlace = isMyTurn ? onPlace : () => {}

  const canvasRef   = useRef(null)
  const [showInfo, setShowInfo] = useState(false)

  useThreeScene(canvasRef, boards, { phase, currentPlayer, onPlace: guardedOnPlace }, lastDestroyed)
  useBotPlayer(state, onRoll, onPlace)

  // Space bar → roll (only for the human player)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      if (mode === 'bot' && currentPlayer === 1) return   // bot's turn, ignore
      if (!isMyTurn) return                               // online: not my turn
      if (phase === PHASES.ROLLING) {
        e.preventDefault()
        onRoll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, currentPlayer, mode, isMyTurn, onRoll])

  // Play destruction sound
  const prevDestroyedRef = useRef([])
  useEffect(() => {
    if (lastDestroyed.length > 0 && lastDestroyed !== prevDestroyedRef.current) {
      playDestruction()
    }
    prevDestroyedRef.current = lastDestroyed
  }, [lastDestroyed])

  // Advance animation phase
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
      {/* Turn strip */}
      <div
        className={styles.turnStrip}
        style={{ '--tc': currentPlayer === 0 ? p0Color : p1Color }}
      >
        <span>
          {t('game.turn_of')} <strong>{playerNames[currentPlayer]}</strong>
          {isBotTurn && <em className={styles.botThinking}> — {t('game.bot_thinking')}</em>}
        </span>
        <div className={styles.stripRight}>
          {!isBotTurn && phase === PHASES.ROLLING && (
            <span className={styles.spaceHint}>{t('game.space_hint')}</span>
          )}
          <InfoButton onClick={() => setShowInfo(true)} />
          <button className={styles.menuBtn} onClick={onMenu}>Menú</button>
        </div>
      </div>

      {/* Main layout */}
      <div className={styles.main}>
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
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
