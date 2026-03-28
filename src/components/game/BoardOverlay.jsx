import styles from './BoardOverlay.module.css'
import { t } from '@/i18n/index.js'
import { isColumnFull } from '@/game/constants.js'

/**
 * 2D overlay rendered on top of the Three.js canvas.
 * Shows column select buttons for the active player, and renders
 * a minimal 2D board representation so the game is legible on mobile.
 */
export function BoardOverlay({ boards, columnScores, currentPlayer, phase, onPlaceDice, currentRoll }) {
  const isPlacing = phase === 'placing'

  return (
    <div className={styles.overlay}>
      {/* Player 1 board (top, flipped) */}
      <BoardGrid
        playerIndex={1}
        board={boards[1]}
        columnScores={columnScores[1]}
        isActive={currentPlayer === 1 && isPlacing}
        onColClick={isPlacing && currentPlayer === 1 ? onPlaceDice : null}
        currentRoll={currentRoll}
        flipped
      />

      <div className={styles.divider} aria-hidden="true" />

      {/* Player 0 board (bottom) */}
      <BoardGrid
        playerIndex={0}
        board={boards[0]}
        columnScores={columnScores[0]}
        isActive={currentPlayer === 0 && isPlacing}
        onColClick={isPlacing && currentPlayer === 0 ? onPlaceDice : null}
        currentRoll={currentRoll}
        flipped={false}
      />
    </div>
  )
}

function BoardGrid({ playerIndex, board, columnScores, isActive, onColClick, currentRoll, flipped }) {
  const color = playerIndex === 0 ? 'var(--p1-color)' : 'var(--p2-color)'

  return (
    <div className={`${styles.boardGrid} ${flipped ? styles.flipped : ''} ${isActive ? styles.boardActive : ''}`}>
      {board.map((col, ci) => {
        const full = isColumnFull(col)
        const canPlace = isActive && !full
        return (
          <div key={ci} className={styles.column}>
            {/* Column score */}
            <div className={styles.colScoreBadge} style={{ '--pc': color }}>
              {columnScores[ci]}
            </div>

            {/* Slots */}
            <div className={styles.slots}>
              {[...col].reverse().map((val, si) => (
                <div
                  key={si}
                  className={`${styles.slot} ${val !== null ? styles.filled : styles.empty}`}
                >
                  {val !== null && <DiceMini value={val} />}
                </div>
              ))}
            </div>

            {/* Column select button */}
            {onColClick && (
              <button
                className={`${styles.colBtn} ${full ? styles.colBtnFull : ''}`}
                disabled={full}
                onClick={() => !full && onColClick(ci)}
                aria-label={`${t('column.aria')} ${ci + 1}${full ? ` (${t('board.full')})` : ''}`}
              >
                {full ? '✕' : '▼'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DiceMini({ value }) {
  return (
    <div className={styles.diceMini} title={`Dado ${value}`}>
      {value}
    </div>
  )
}
