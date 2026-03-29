import { useEffect, useRef, useState } from 'react'
import { DiceDisplay } from './DiceDisplay.jsx'
import { isColumnFull } from '@/game/constants.js'
import { t } from '@/i18n/index.js'
import styles from './PlayerPanel.module.css'

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
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(prev + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return display
}

function Ornament() {
  return (
    <svg width="120" height="20" aria-hidden="true" className={styles.ornament}>
      <line x1="0" y1="10" x2="45" y2="10" stroke="#3a3a3a" strokeWidth="1"/>
      <circle cx="60" cy="10" r="4" fill="none" stroke="#8B0000" strokeWidth="1"/>
      <line x1="75" y1="10" x2="120" y2="10" stroke="#3a3a3a" strokeWidth="1"/>
    </svg>
  )
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
  const scoreDisplay = useCountUp(totalScore)
  const initial  = (playerName || '?')[0].toUpperCase()
  const scoreColor = playerIndex === 0 ? '#c8860a' : '#c41e3a'

  return (
    <aside
      className={`${styles.panel} ${isMyTurn ? styles.active : styles.inactive} ${playerIndex === 1 ? styles.right : ''}`}
      aria-label={`Panel de ${playerName}`}
    >
      {/* Avatar + name */}
      <div className={styles.header}>
        <div className={styles.avatar} style={{ borderColor: isMyTurn ? scoreColor : '#3a3a3a' }}>
          <span className={styles.avatarInitial}>{initial}</span>
        </div>
        <Ornament />
        <span className={`${styles.name} ${isMyTurn ? styles.nameActive : ''}`}>
          {playerName}
        </span>
      </div>

      {/* Score */}
      <div className={styles.scoreBlock}>
        <span className={styles.scoreValue} style={{ color: scoreColor }}>
          {scoreDisplay}
        </span>
        <span className={styles.scoreLabel}>{t('game.score')}</span>
      </div>

      {/* Column scores pills */}
      <div className={styles.colScores}>
        {columnScores.map((s, i) => (
          <div key={i} className={styles.colBadge}>
            <span className={styles.colLabel}>{t('game.column')}{i + 1}</span>
            <span className={styles.colVal}>{s}</span>
          </div>
        ))}
      </div>

      <Ornament />

      {/* Die box */}
      <div className={styles.dieBox}>
        {currentRoll !== null && isMyTurn ? (
          <DiceDisplay value={currentRoll} size={64} />
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

      {/* Column buttons */}
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

      <div className={styles.spacer} />

      <p className={styles.disclaimer}>Fan project · © Massive Monster</p>
    </aside>
  )
}
