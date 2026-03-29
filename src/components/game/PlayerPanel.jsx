import { DiceDisplay } from './DiceDisplay.jsx'
import { isColumnFull } from '@/game/constants.js'
import { t } from '@/i18n/index.js'
import styles from './PlayerPanel.module.css'

/**
 * Side panel for one player.
 * Shows name, score, the current rolled die, and action buttons.
 *
 * @param {object}   props
 * @param {number}   props.playerIndex     0 or 1
 * @param {string}   props.playerName
 * @param {number}   props.totalScore
 * @param {number[]} props.columnScores    array of 3 values
 * @param {boolean}  props.isMyTurn        true when this player is the active one
 * @param {'rolling'|'placing'|'animating'|'gameover'} props.phase
 * @param {number|null} props.currentRoll  null when no die rolled yet
 * @param {Array}    props.board           3 columns × 3 slots for this player
 * @param {()=>void} props.onRoll
 * @param {(col:number)=>void} props.onPlace
 */
export function PlayerPanel({
  playerIndex,
  playerName,
  totalScore,
  columnScores,
  isMyTurn,
  phase,
  currentRoll,
  board,
  onRoll,
  onPlace,
  isBot = false,   // hides interactive controls for the bot player
}) {
  const canRoll  = isMyTurn && phase === 'rolling'  && !isBot
  const canPlace = isMyTurn && phase === 'placing'  && !isBot
  const color    = playerIndex === 0 ? 'var(--p1-color)' : 'var(--p2-color)'

  return (
    <aside
      className={`${styles.panel} ${isMyTurn ? styles.active : ''}`}
      style={{ '--pc': color }}
      aria-label={`Panel de ${playerName}`}
    >
      {/* Player header */}
      <div className={styles.header}>
        <span className={styles.dot} />
        <span className={styles.name}>{playerName}</span>
      </div>

      {/* Score */}
      <div className={styles.scoreRow}>
        <span className={styles.scoreLabel}>{t('game.score')}</span>
        <span className={styles.scoreValue}>{totalScore}</span>
      </div>

      {/* Column scores */}
      <div className={styles.colScores}>
        {columnScores.map((s, i) => (
          <div key={i} className={styles.colBadge}>
            <span className={styles.colLabel}>{t('game.column')}{i + 1}</span>
            <span className={styles.colVal}>{s}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Die box */}
      <div className={styles.dieBox}>
        {currentRoll !== null && isMyTurn ? (
          <DiceDisplay value={currentRoll} size={60} />
        ) : (
          <div className={styles.diePlaceholder}>
            <span>?</span>
          </div>
        )}
        {isMyTurn && canPlace && (
          <p className={styles.dieHint}>{t('game.place')}</p>
        )}
      </div>

      {/* Roll button — hidden for bot */}
      {!isBot && (
        <button
          className={`${styles.rollBtn} ${!canRoll ? styles.disabled : ''}`}
          disabled={!canRoll}
          onClick={canRoll ? onRoll : undefined}
          aria-label={t('game.roll')}
        >
          {t('game.roll')}
        </button>
      )}

      {/* Column select buttons — hidden for bot */}
      <div className={styles.colBtns} style={isBot ? { visibility: 'hidden' } : undefined}>
        {board.map((col, ci) => {
          const full     = isColumnFull(col)
          const enabled  = canPlace && !full
          return (
            <button
              key={ci}
              className={`${styles.colBtn} ${!enabled ? styles.disabled : ''} ${full ? styles.full : ''}`}
              disabled={!enabled}
              onClick={enabled ? () => onPlace(ci) : undefined}
              aria-label={`${t('column.aria')} ${ci + 1}${full ? ` (${t('board.full')})` : ''}`}
            >
              <span className={styles.colBtnNum}>{ci + 1}</span>
              {full && <span className={styles.colBtnFull}>✕</span>}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
