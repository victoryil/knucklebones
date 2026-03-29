import { useEffect, useRef, useState } from 'react'
import { DiceDisplay } from './DiceDisplay.jsx'
import { isColumnFull } from '@/game/constants.js'
import { t } from '@/i18n/index.js'
import styles from './PlayerPanel.module.css'

/** Animates a number from its previous value to `target` over `duration` ms */
function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const prev = prevRef.current
    if (prev === target) return
    prevRef.current = target

    const startTime = performance.now()
    const diff = target - prev

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplay(Math.round(prev + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return display
}

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
  isBot = false,
}) {
  const canRoll  = isMyTurn && phase === 'rolling' && !isBot
  const canPlace = isMyTurn && phase === 'placing' && !isBot
  const color    = playerIndex === 0 ? 'var(--p1-color)' : 'var(--p2-color)'
  const scoreDisplay = useCountUp(totalScore)

  return (
    <aside
      className={`${styles.panel} ${isMyTurn ? styles.active : styles.inactive}`}
      style={{ '--pc': color }}
      aria-label={`Panel de ${playerName}`}
    >
      {/* Player header */}
      <div className={styles.header}>
        <span className={styles.dot} />
        <span className={`${styles.name} ${isMyTurn ? styles.nameActive : ''}`}>
          {isMyTurn && <span className={styles.flame} aria-hidden="true">🔥</span>}
          {playerName}
        </span>
      </div>

      {/* Score */}
      <div className={styles.scoreRow}>
        <span className={styles.scoreLabel}>{t('game.score')}</span>
        <span
          className={styles.scoreValue}
          style={{ color: playerIndex === 0 ? '#c8860a' : '#c41e3a' }}
        >
          {scoreDisplay}
        </span>
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

      {/* Roll button */}
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

      {/* Column select buttons */}
      <div className={styles.colBtns} style={isBot ? { visibility: 'hidden' } : undefined}>
        {board.map((col, ci) => {
          const full    = isColumnFull(col)
          const enabled = canPlace && !full
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
