import { useEffect, useRef } from 'react'
import { PlayerPanel } from '@/components/game/PlayerPanel.jsx'
import { useThreeScene } from '@/hooks/useThreeScene.js'
import { PHASES } from '@/game/constants.js'
import { t } from '@/i18n/index.js'
import styles from './GameScreen.module.css'

export function GameScreen({ state, onRoll, onPlace, onAnimationDone, onMenu }) {
  const { phase, currentPlayer, boards, scores, columnScores, currentRoll, playerNames } = state
  const canvasRef = useRef(null)

  useThreeScene(canvasRef, boards)

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
        <button className={styles.menuBtn} onClick={onMenu}>Menú</button>
      </div>

      {/* Main layout: side panel | canvas | side panel */}
      <div className={styles.main}>
        {/* P0 panel (left) */}
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

        {/* 3D canvas */}
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        {/* P1 panel (right) */}
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
    </div>
  )
}
