import styles from './ScorePanel.module.css'
import { t } from '@/i18n/index.js'

export function ScorePanel({ playerIndex, playerName, totalScore, columnScores, isActive }) {
  const color = playerIndex === 0 ? 'var(--p1-color)' : 'var(--p2-color)'

  return (
    <div className={`${styles.panel} ${isActive ? styles.active : ''}`}>
      <div className={styles.header} style={{ '--player-color': color }}>
        <span className={styles.dot} />
        <span className={styles.name}>{playerName}</span>
        <span className={styles.total}>{totalScore}</span>
      </div>
      <div className={styles.cols}>
        {columnScores.map((score, i) => (
          <div key={i} className={styles.colScore}>
            <span className={styles.colLabel}>{t('game.column')}{i + 1}</span>
            <span className={styles.colVal}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
