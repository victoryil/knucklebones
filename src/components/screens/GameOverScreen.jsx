import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button.jsx'
import { t } from '@/i18n/index.js'
import { recordResult, getRecord } from '@/stats/statsStore.js'
import { settings } from '@/settings/store.js'
import styles from './GameOverScreen.module.css'

export function GameOverScreen({ state, onRematch, onMenu, playerIndex = 0 }) {
  const { scores, columnScores, playerNames, winner, boards } = state
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 400)
    return () => clearTimeout(id)
  }, [])

  const isTie = winner === null

  // Record result and get updated record
  useEffect(() => {
    const difficulty = settings.botDifficulty ?? 'normal'
    const humanWon = winner === playerIndex
    const outcome = isTie ? 'draw' : (humanWon ? 'win' : 'loss')
    // Skip recording for local mode — no clear "human" side
    if (state.mode !== 'local') recordResult(state.mode, difficulty, outcome)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const difficulty = settings.botDifficulty ?? 'normal'
  const record = state.mode !== 'local' ? getRecord(state.mode, difficulty) : null
  const titleText = isTie
    ? t('gameover.tie')
    : `${playerNames[winner]} ${t('gameover.wins')}`

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        {/* Crown / skull trophy */}
        <div className={styles.trophy} aria-hidden="true">
          {isTie ? <TieSvg /> : <CrownSvg />}
        </div>

        <h2 className={`${styles.title} ${revealed ? styles.revealed : ''}`}>
          {titleText}
        </h2>

        {!isTie && (
          <p className={`${styles.score} ${revealed ? styles.revealed : ''}`}>
            {scores[winner]} {t('gameover.points')}
          </p>
        )}

        <div className={`${styles.finalScores} ${revealed ? styles.revealed : ''}`}>
          <h3 className={styles.scoresTitle}>{t('gameover.final_scores')}</h3>
          <div className={styles.scoresGrid}>
            {[0, 1].map(pi => (
              <PlayerResult
                key={pi}
                playerIndex={pi}
                name={playerNames[pi]}
                score={scores[pi]}
                columnScores={columnScores[pi]}
                isWinner={winner === pi}
              />
            ))}
          </div>
        </div>

        {record && (
          <p className={styles.record}>
            {t('gameover.record')}: {record.wins}W / {record.losses}L
            {record.draws > 0 ? ` / ${record.draws}D` : ''}
          </p>
        )}

        <div className={styles.buttons}>
          <Button onClick={onRematch}>{t('gameover.rematch')}</Button>
          <Button variant="ghost" onClick={onMenu}>{t('gameover.menu')}</Button>
        </div>
      </div>
    </div>
  )
}

function PlayerResult({ playerIndex, name, score, columnScores, isWinner }) {
  const color = playerIndex === 0 ? 'var(--p1-color)' : 'var(--p2-color)'
  return (
    <div className={`${styles.playerResult} ${isWinner ? styles.winner : ''}`} style={{ '--pc': color }}>
      {isWinner && <span className={styles.winnerLabel}>{t('gameover.winner')}</span>}
      <div className={styles.playerName}>
        <span className={styles.playerDot} />
        {name}
      </div>
      <div className={styles.playerScore}>{score}</div>
      <div className={styles.colBreakdown}>
        {columnScores.map((cs, i) => (
          <span key={i} className={styles.colChip}>{t('game.column')}{i + 1}: {cs}</span>
        ))}
      </div>
    </div>
  )
}

function CrownSvg() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,50 10,20 25,35 40,10 55,35 70,20 70,50" fill="var(--accent-gold)" opacity="0.9"/>
      <circle cx="10" cy="20" r="5" fill="var(--accent-gold-bright)"/>
      <circle cx="40" cy="10" r="5" fill="var(--accent-gold-bright)"/>
      <circle cx="70" cy="20" r="5" fill="var(--accent-gold-bright)"/>
      <rect x="8" y="48" width="64" height="8" rx="3" fill="var(--accent-gold)"/>
    </svg>
  )
}

function TieSvg() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="40" y="48" fontSize="48" textAnchor="middle" fill="var(--text-secondary)">🤝</text>
    </svg>
  )
}
