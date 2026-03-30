import { useState, useRef, useEffect } from 'react'
import { sendMove } from '@/network/networkInterface.js'
import { t } from '@/i18n/index.js'
import styles from './EmoteBar.module.css'

export const EMOTES = [
  { id: 'gg',        emoji: '🤝', labelKey: 'emote.gg' },
  { id: 'good_move', emoji: '👏', labelKey: 'emote.good_move' },
  { id: 'oops',      emoji: '😬', labelKey: 'emote.oops' },
  { id: 'haha',      emoji: '😂', labelKey: 'emote.haha' },
  { id: 'rematch',   emoji: '⚔️',  labelKey: 'emote.rematch' },
  { id: 'luck',      emoji: '🍀', labelKey: 'emote.luck' },
]

const COOLDOWN_MS = 3000

export function EmoteBar({ onSent }) {
  const [open, setOpen]       = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const cdRef = useRef(null)

  // Close picker when clicking outside
  const wrapRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleSend = (emote) => {
    if (cooldown) return
    sendMove({ type: 'EMOTE', id: emote.id })
    onSent?.(emote)
    setOpen(false)
    setCooldown(true)
    cdRef.current = setTimeout(() => setCooldown(false), COOLDOWN_MS)
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(cdRef.current), [])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <div className={styles.picker}>
          {EMOTES.map(e => (
            <button
              key={e.id}
              className={styles.emoteBtn}
              onClick={() => handleSend(e)}
              title={t(e.labelKey)}
            >
              <span className={styles.emoji}>{e.emoji}</span>
              <span className={styles.label}>{t(e.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
      <button
        className={`${styles.toggle} ${cooldown ? styles.onCooldown : ''} ${open ? styles.open : ''}`}
        onClick={() => !cooldown && setOpen(o => !o)}
        title={cooldown ? t('emote.cooldown') : t('emote.open')}
        aria-label={t('emote.open')}
      >
        {cooldown ? '⏳' : '💬'}
      </button>
    </div>
  )
}
