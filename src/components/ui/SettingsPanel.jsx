import { useState } from 'react'
import { audioEngine } from '@/audio/audioEngine.js'
import { settings, updateSetting } from '@/settings/store.js'
import styles from './SettingsPanel.module.css'

/**
 * Settings overlay panel.
 * @param {object}      props
 * @param {Function}    props.onClose
 * @param {SceneManager|null} props.sceneManager  — null when not in GameScreen
 */
export function SettingsPanel({ onClose, sceneManager = null, force2D = false, onToggle2D = null }) {
  // Local state mirrors settings store so controls re-render on change
  const [masterVolume,    setMasterVolume]    = useState(settings.masterVolume)
  const [musicVolume,     setMusicVolume]     = useState(settings.musicVolume)
  const [sfxVolume,       setSfxVolume]       = useState(settings.sfxVolume)
  const [musicEnabled,    setMusicEnabled]    = useState(settings.musicEnabled)
  const [sfxEnabled,      setSfxEnabled]      = useState(settings.sfxEnabled)
  const [bloomEnabled,    setBloomEnabled]    = useState(settings.bloomEnabled)
  const [shakeEnabled,    setShakeEnabled]    = useState(settings.shakeEnabled)
  const [particles,       setParticles]       = useState(settings.particlesEnabled)
  const [quality,         setQuality]         = useState(settings.quality)
  const [fastAnim,        setFastAnim]        = useState(settings.fastAnimations)
  const [botDifficulty,   setBotDifficulty]   = useState(settings.botDifficulty)
  const [mode2D,          setMode2D]          = useState(force2D)

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleMasterVolume = (v) => {
    setMasterVolume(v)
    updateSetting('masterVolume', v)
    audioEngine.setMasterVolume(v)
  }
  const handleMusicVolume = (v) => {
    setMusicVolume(v)
    updateSetting('musicVolume', v)
    audioEngine.setMusicVolume(v)
  }
  const handleSfxVolume = (v) => {
    setSfxVolume(v)
    updateSetting('sfxVolume', v)
    audioEngine.setSfxVolume(v)
  }
  const handleMusicEnabled = (v) => {
    setMusicEnabled(v)
    updateSetting('musicEnabled', v)
    audioEngine.setMusicEnabled(v)
  }
  const handleSfxEnabled = (v) => {
    setSfxEnabled(v)
    updateSetting('sfxEnabled', v)
    audioEngine.setSfxEnabled(v)
  }
  const handleBloom = (v) => {
    setBloomEnabled(v)
    updateSetting('bloomEnabled', v)
    sceneManager?.setBloomEnabled(v)
  }
  const handleShake = (v) => {
    setShakeEnabled(v)
    updateSetting('shakeEnabled', v)
  }
  const handleParticles = (v) => {
    setParticles(v)
    updateSetting('particlesEnabled', v)
  }
  const handleQuality = (v) => {
    setQuality(v)
    updateSetting('quality', v)
    sceneManager?.setQuality(v)
  }
  const handleFastAnim = (v) => {
    setFastAnim(v)
    updateSetting('fastAnimations', v)
    sceneManager?.setFastAnimations(v)
  }
  const handleBotDifficulty = (v) => {
    setBotDifficulty(v)
    updateSetting('botDifficulty', v)
  }
  const handleMode2D = (v) => {
    setMode2D(v)
    onToggle2D?.(v)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>⚙ Settings</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* ── Audio ─────────────────────────────────────────────── */}
          <Section label="Audio">
            <SliderRow
              label="Master volume"
              value={masterVolume}
              onChange={handleMasterVolume}
            />
            <SliderRow
              label="Music volume"
              value={musicVolume}
              onChange={handleMusicVolume}
              disabled={!musicEnabled}
            />
            <SliderRow
              label="SFX volume"
              value={sfxVolume}
              onChange={handleSfxVolume}
              disabled={!sfxEnabled}
            />
            <ToggleRow label="Music" value={musicEnabled}  onChange={handleMusicEnabled} />
            <ToggleRow label="SFX"   value={sfxEnabled}    onChange={handleSfxEnabled}   />
          </Section>

          {/* ── Graphics ──────────────────────────────────────────── */}
          <Section label="Graphics">
            <ToggleRow label="Modo 2D (sin 3D)" value={mode2D} onChange={handleMode2D} hint="Mejor rendimiento en dispositivos lentos" />
            <ToggleRow label="Bloom"       value={bloomEnabled} onChange={handleBloom}    />
            <ToggleRow label="Screen shake" value={shakeEnabled} onChange={handleShake}   />
            <ToggleRow label="Particles"    value={particles}    onChange={handleParticles} />
            <SelectRow
              label="Quality"
              value={quality}
              options={[
                { value: 'high',   label: 'High'   },
                { value: 'medium', label: 'Medium' },
                { value: 'low',    label: 'Low'    },
              ]}
              onChange={handleQuality}
            />
          </Section>

          {/* ── Game ──────────────────────────────────────────────── */}
          <Section label="Game">
            <ToggleRow label="Fast animations" value={fastAnim} onChange={handleFastAnim} />
            <SelectRow
              label="Bot difficulty"
              value={botDifficulty}
              options={[
                { value: 'easy',   label: 'Easy'   },
                { value: 'normal', label: 'Normal' },
                { value: 'hard',   label: 'Hard'   },
              ]}
              onChange={handleBotDifficulty}
            />
          </Section>
        </div>
      </aside>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionLabel}>{label}</h3>
      {children}
    </div>
  )
}

function SliderRow({ label, value, onChange, disabled = false }) {
  return (
    <div className={`${styles.row} ${disabled ? styles.rowDisabled : ''}`}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={value}
          disabled={disabled}
          onChange={e => onChange(parseFloat(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.sliderVal}>{Math.round(value * 100)}</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, hint }) {
  return (
    <div className={styles.rowBlock}>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{label}</span>
        <button
          className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
          onClick={() => onChange(!value)}
          aria-pressed={value}
        >
          {value ? 'On' : 'Off'}
        </button>
      </div>
      {hint && <p className={styles.rowHint}>{hint}</p>}
    </div>
  )
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
