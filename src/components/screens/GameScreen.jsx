import { useEffect, useRef, useState } from 'react'
import { PlayerPanel } from '@/components/game/PlayerPanel.jsx'
import { InfoModal, InfoButton } from '@/components/ui/InfoModal.jsx'
import { useThreeScene } from '@/hooks/useThreeScene.js'
import { PHASES } from '@/game/constants.js'
import { playDestruction } from '@/audio/soundManager.js'
import { t } from '@/i18n/index.js'
import styles from './GameScreen.module.css'

export function GameScreen({ state, onRoll, onPlace, onAnimationDone, onMenu }) {
  const { phase, currentPlayer, boards, scores, columnScores, currentRoll, playerNames, lastDestroyed } = state
  const canvasRef    = useRef(null)
  const [showInfo, setShowInfo] = useState(false)

  useThreeScene(canvasRef, boards)

  // Play destruction sound whenever lastDestroyed has entries
  const prevDestroyedRef = useRef([])
  useEffect(() => {
    if (lastDestroyed.length > 0 && lastDestroyed !== prevDestroyedRef.current) {
      playDestruction()
    }
    prevDestroyedRef.current = lastDestroyed
  }, [lastDestroyed])

  // Advance animation phase after a short delay
  useEffect(() => {
    if (phase === PHASES.ANIMATING) {
      const id = setTimeout(onAnimationDone, 700)
      return () => clearTimeout(id)
    }
  }, [phase, onAnimationDone])

  return (
    <div className={styles.screen}>
      {/* Turn indicator strip */}
      <div
        className={styles.turnStrip}
        style={{ '--tc': currentPlayer === 0 ? 'var(--p1-color)' : 'var(--p2-color)' }}
      >
        <span>{t('game.turn_of')} <strong>{playerNames[currentPlayer]}</strong></span>
        <div className={styles.stripRight}>
          <InfoButton onClick={() => setShowInfo(true)} />
          <button className={styles.menuBtn} onClick={onMenu}>Menú</button>
        </div>
      </div>

      {/* Main layout: panel | canvas | panel */}
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
          onRoll={onRoll}
          onPlace={onPlace}
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
          onRoll={onRoll}
          onPlace={onPlace}
        />
      </div>

      {/* Rules modal */}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
