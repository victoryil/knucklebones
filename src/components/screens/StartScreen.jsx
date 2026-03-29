import { useState } from 'react'
import { Button } from '@/components/ui/Button.jsx'
import { host, join } from '@/network/networkInterface.js'
import { t } from '@/i18n/index.js'
import styles from './StartScreen.module.css'

export function StartScreen({ onStart, locale, onToggleLocale }) {
  const [p1, setP1]   = useState('')
  const [mode, setMode] = useState('local')   // 'local' | 'bot' | 'online'

  const handleStart = () => {
    onStart({
      playerNames: [
        p1.trim() || t('start.player1_placeholder'),
        mode === 'bot' ? t('start.bot_name') : t('start.player2_placeholder'),
      ],
      mode,
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{ '--i': i }} />
        ))}
      </div>

      <button
        className={styles.localeBtn}
        onClick={onToggleLocale}
        aria-label={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        {locale === 'es' ? 'EN' : 'ES'}
      </button>

      <main className={styles.main}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.skullDecor} aria-hidden="true"><SkullSvg size={64} /></div>
          <h1 className={styles.title}>Knucklebones</h1>
          <p className={styles.subtitle}>{t('start.subtitle')}</p>
        </div>

        {/* Mode selector */}
        <div className={styles.modeRow}>
          <button
            className={`${styles.modeBtn} ${mode === 'local' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('local')}
          >
            {t('start.play_local')}
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'bot' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('bot')}
          >
            {t('start.play_bot')}
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'online' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('online')}
          >
            {t('start.play_online')}
          </button>
        </div>

        {/* Player name + second player area */}
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

          {mode === 'local' && <LocalP2Field locale={locale} />}
          {mode === 'bot'   && <BotLabel />}
          {mode === 'online' && (
            <OnlinePanel
              p1Name={p1.trim() || t('start.player1_placeholder')}
              onStart={onStart}
            />
          )}
        </div>

        {mode !== 'online' && (
          <Button onClick={handleStart} className={styles.mainBtn}>
            {mode === 'bot' ? `▶ ${t('start.play_bot')}` : `▶ ${t('start.play_local')}`}
          </Button>
        )}
      </main>

      <footer className={styles.footer}>
        <p>{t('disclaimer.text')}</p>
      </footer>
    </div>
  )
}

/** Host / Join flow for online mode */
function OnlinePanel({ p1Name, onStart }) {
  const [subMode, setSubMode] = useState(null)    // null | 'host' | 'join'
  const [roomCode, setRoomCode] = useState('')     // generated code (host) or typed code (join)
  const [status, setStatus] = useState('idle')    // 'idle' | 'pending' | 'waiting' | 'connecting'

  const handleHost = async () => {
    setSubMode('host')
    setStatus('pending')
    const code = await host(() => {
      // opponent connected → start game as player 0
      onStart({ playerNames: [p1Name, t('start.online_opponent')], mode: 'online', playerIndex: 0 })
    })
    setRoomCode(code)
    setStatus('waiting')
  }

  const handleJoin = () => {
    setSubMode('join')
    setStatus('idle')
    setRoomCode('')
  }

  const handleConnect = async () => {
    if (!roomCode.trim()) return
    setStatus('connecting')
    await join(roomCode.trim(), () => {
      // connected → start game as player 1
      onStart({ playerNames: [p1Name, t('start.online_opponent')], mode: 'online', playerIndex: 1 })
    })
  }

  return (
    <div className={styles.onlinePanel}>
      {/* Host / Join sub-buttons */}
      {status === 'idle' && subMode === null && (
        <div className={styles.onlineSubRow}>
          <button className={styles.modeBtn} onClick={handleHost}>
            {t('start.host_game')}
          </button>
          <button className={styles.modeBtn} onClick={handleJoin}>
            {t('start.join_game')}
          </button>
        </div>
      )}

      {/* Host: pending (generating code) */}
      {subMode === 'host' && status === 'pending' && (
        <p className={styles.onlineStatus}>{t('start.generating_code')}</p>
      )}

      {/* Host: waiting for opponent */}
      {subMode === 'host' && status === 'waiting' && (
        <div className={styles.onlineCodeBox}>
          <span className={styles.onlineCodeLabel}>{t('start.room_code')}</span>
          <strong className={styles.onlineCode}>{roomCode}</strong>
          <p className={styles.onlineStatus}>{t('start.waiting_opponent')}</p>
        </div>
      )}

      {/* Join: input + connect */}
      {subMode === 'join' && status === 'idle' && (
        <div className={styles.onlineJoinRow}>
          <input
            className={styles.nameInput}
            type="text"
            placeholder={t('start.enter_room_code')}
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />
          <button className={`${styles.modeBtn} ${styles.modeBtnActive}`} onClick={handleConnect}>
            {t('start.connect')}
          </button>
        </div>
      )}

      {/* Join: connecting */}
      {subMode === 'join' && status === 'connecting' && (
        <p className={styles.onlineStatus}>{t('start.connecting')}</p>
      )}

      {/* Back button */}
      {subMode !== null && (
        <button
          className={styles.onlineBack}
          onClick={() => { setSubMode(null); setStatus('idle'); setRoomCode('') }}
        >
          ← Back
        </button>
      )}
    </div>
  )
}

/** Separate component so the input state survives mode switch back to local */
function LocalP2Field({ locale }) {
  const [p2, setP2] = useState('')
  return (
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
  )
}

function BotLabel() {
  return (
    <div className={styles.botLabelWrap}>
      <span className={styles.playerDot} style={{ background: 'var(--p2-color)' }} />
      <span className={styles.botLabelText}>{t('start.bot_name')}</span>
      <span className={styles.botChip}>IA</span>
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
