import { useState } from 'react'
import { Button } from '@/components/ui/Button.jsx'
import { t } from '@/i18n/index.js'
import styles from './StartScreen.module.css'

export function StartScreen({ onStart }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  const handleStart = () => {
    onStart({
      playerNames: [p1.trim() || 'Jugador 1', p2.trim() || 'Jugador 2'],
      mode: 'local',
    })
  }

  return (
    <div className={styles.screen}>
      {/* Background ambient particles */}
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{ '--i': i }} />
        ))}
      </div>

      <main className={styles.main}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.skullDecor} aria-hidden="true">
            <SkullSvg size={64} />
          </div>
          <h1 className={styles.title}>Knucklebones</h1>
          <p className={styles.subtitle}>{t('start.subtitle')}</p>
        </div>

        {/* Player name inputs */}
        <div className={styles.namesArea}>
          <div className={styles.nameField}>
            <label className={styles.nameLabel} htmlFor="p1name">
              <span className={styles.playerDot} style={{ background: 'var(--p1-color)' }} />
              {t('start.player1_name')}
            </label>
            <input
              id="p1name"
              className={styles.nameInput}
              type="text"
              maxLength={20}
              placeholder={t('start.player1_placeholder')}
              value={p1}
              onChange={e => setP1(e.target.value)}
            />
          </div>
          <div className={styles.nameField}>
            <label className={styles.nameLabel} htmlFor="p2name">
              <span className={styles.playerDot} style={{ background: 'var(--p2-color)' }} />
              {t('start.player2_name')}
            </label>
            <input
              id="p2name"
              className={styles.nameInput}
              type="text"
              maxLength={20}
              placeholder={t('start.player2_placeholder')}
              value={p2}
              onChange={e => setP2(e.target.value)}
            />
          </div>
        </div>

        {/* Mode buttons */}
        <div className={styles.buttons}>
          <Button onClick={handleStart} className={styles.mainBtn}>
            {t('start.play_local')}
          </Button>
          <div className={styles.soonGroup}>
            <div className={styles.tooltipWrap}>
              <Button variant="ghost" disabled>{t('start.play_online')}</Button>
              <span className={styles.tooltip}>{t('start.coming_soon')}</span>
            </div>
            <div className={styles.tooltipWrap}>
              <Button variant="ghost" disabled>{t('start.play_bot')}</Button>
              <span className={styles.tooltip}>{t('start.coming_soon')}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className={styles.footer}>
        <p>{t('disclaimer.text')}</p>
      </footer>
    </div>
  )
}

function SkullSvg({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="32" cy="26" rx="20" ry="20" fill="var(--accent-gold)" opacity="0.9"/>
      <rect x="18" y="42" width="28" height="14" rx="4" fill="var(--accent-gold)" opacity="0.9"/>
      <rect x="18" y="50" width="7" height="8" fill="var(--bg-dark)"/>
      <rect x="28" y="50" width="8" height="8" fill="var(--bg-dark)"/>
      <rect x="39" y="50" width="7" height="8" fill="var(--bg-dark)"/>
      <ellipse cx="24" cy="26" rx="5" ry="6" fill="var(--bg-dark)"/>
      <ellipse cx="40" cy="26" rx="5" ry="6" fill="var(--bg-dark)"/>
    </svg>
  )
}
