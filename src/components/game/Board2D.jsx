import { DiceDisplay } from './DiceDisplay.jsx'
import { isColumnFull } from '@/game/constants.js'
import { PHASES } from '@/game/constants.js'
import { t } from '@/i18n/index.js'
import styles from './Board2D.module.css'

// ── Board grid ─────────────────────────────────────────────────────────────
// Slot 0 is nearest to the centre divider (matching the 3D layout).
// • Opponent (player 1) at top  → slots run 2→1→0 top-to-bottom so slot 0 is
//   closest to the divider at the bottom of their section.
// • Player   (player 0) at bottom → slots run 0→1→2 top-to-bottom so slot 0
//   is closest to the divider at the top of their section.
const SLOT_ORDER = {
  0: [0, 1, 2],   // player 0 — nearest slot at top
  1: [2, 1, 0],   // player 1 — nearest slot at bottom
}

function BoardGrid({ board, playerIndex, columnScores, canPlace, onPlace }) {
  const isP0   = playerIndex === 0
  const order  = SLOT_ORDER[playerIndex]

  return (
    <div className={styles.boardGrid}>
      {/* Column score badges */}
      <div className={styles.colScoreRow}>
        {columnScores.map((s, ci) => (
          <div
            key={ci}
            className={`${styles.colScore} ${isP0 ? styles.colScoreP0 : styles.colScoreP1}`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* 3×3 grid (3 columns of 3 cells) */}
      <div className={styles.gridCells}>
        {board.map((col, ci) => {
          const full = isColumnFull(col)
          const canPlaceHere = canPlace && !full
          return (
            <div
              key={ci}
              className={`${styles.gridCol} ${canPlaceHere ? styles.gridColActive : ''}`}
            >
              {order.map((si) => {
                const val = col[si]
                // Count matching dice in this column for combo tinting
                const combo = val !== null ? col.filter(v => v === val).length : 1
                return (
                  <div
                    key={si}
                    className={`${styles.cell} ${isP0 ? styles.cellP0 : styles.cellP1}`}
                  >
                    {val !== null && (
                      // key on the inner wrapper triggers popIn CSS animation
                      // each time a new die value appears in this slot.
                      <div className={styles.dieAnim} key={`${ci}-${si}-${val}`}>
                        <DiceDisplay value={val} size={42} combo={combo} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Board2D ────────────────────────────────────────────────────────────────
export function Board2D({ state, onRoll, onPlace, mode, selectedCol = 0 }) {
  const { boards, scores, columnScores, phase, currentRoll, playerNames, currentPlayer } = state

  const isBotTurn    = mode === 'bot' && currentPlayer === 1
  const isHumanTurn  = mode === 'bot' ? currentPlayer === 0 : true
  const canRoll      = isHumanTurn && phase === PHASES.ROLLING
  const canPlace     = isHumanTurn && phase === PHASES.PLACING

  return (
    <div className={styles.layout}>
      {/* ── Opponent (player 1) — top ──────────────────────────────────── */}
      <div className={styles.opponentSection}>
        <div className={styles.playerHeader}>
          <span className={styles.headerName}>{playerNames[1]}</span>
          {isBotTurn && <span className={styles.botChip}>IA</span>}
          <span className={`${styles.headerScore} ${styles.scoreOpp}`}>{scores[1]}</span>
        </div>
        <BoardGrid
          board={boards[1]}
          playerIndex={1}
          columnScores={columnScores[1]}
          canPlace={false}
          onPlace={null}
        />
      </div>

      {/* ── Central zone ───────────────────────────────────────────────── */}
      <div className={styles.central}>
        <span className={`${styles.centralScore} ${styles.scoreP0}`}>{scores[0]}</span>

        <div className={styles.centralDie}>
          {isBotTurn && phase === PHASES.ROLLING && (
            <span className={styles.botHint}>{t('game.bot_thinking')}</span>
          )}
          {canRoll && (
            <button
              className={styles.rollBtn}
              onClick={onRoll}
              style={{ touchAction: 'manipulation' }}
            >
              {t('game.roll')}
            </button>
          )}
          {currentRoll !== null && (
            <DiceDisplay value={currentRoll} size={54} glow />
          )}
        </div>

        <span className={`${styles.centralScore} ${styles.scoreOpp}`}>{scores[1]}</span>
      </div>

      {/* ── Turn strip ─────────────────────────────────────────────────── */}
      <div className={styles.turnStrip}>
        {t('game.turn_of')} <strong>{playerNames[currentPlayer]}</strong>
      </div>

      {/* ── Player (player 0) — bottom ──────────────────────────────────── */}
      <div className={styles.playerSection}>
        <BoardGrid
          board={boards[0]}
          playerIndex={0}
          columnScores={columnScores[0]}
          canPlace={canPlace}
          onPlace={onPlace}
        />

        {/* Column select buttons — touch-friendly, 44px height */}
        <div className={styles.colBtns}>
          {boards[0].map((col, ci) => {
            const full    = isColumnFull(col)
            const enabled = canPlace && !full
            const isSel   = canPlace && ci === selectedCol
            return (
              <button
                key={ci}
                className={`${styles.colBtn} ${enabled ? styles.colBtnEnabled : ''} ${full ? styles.colBtnFull : ''} ${isSel ? styles.colBtnSelected : ''}`}
                disabled={!enabled}
                onClick={enabled ? () => onPlace(ci) : undefined}
                aria-label={`${t('column.aria')} ${ci + 1}${full ? ` (${t('board.full')})` : ''}`}
                style={{ touchAction: 'manipulation' }}
              >
                {full ? '✕' : ci + 1}
              </button>
            )
          })}
        </div>

        <div className={styles.playerHeader}>
          <span className={`${styles.headerScore} ${styles.scoreP0}`}>{scores[0]}</span>
          <span className={styles.headerName}>{playerNames[0]}</span>
        </div>
      </div>
    </div>
  )
}
