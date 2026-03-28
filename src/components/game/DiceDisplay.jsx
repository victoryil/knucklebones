import styles from './DiceDisplay.module.css'

const SKULL_POSITIONS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80], [72, 80]],
}

function SkullIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="10" rx="8" ry="8"/>
      <rect x="7" y="16" width="10" height="6" rx="1.5"/>
      <rect x="7" y="19" width="2.5" height="3.5" fill="var(--bg-dark)"/>
      <rect x="10.75" y="19" width="2.5" height="3.5" fill="var(--bg-dark)"/>
      <rect x="14.5" y="19" width="2.5" height="3.5" fill="var(--bg-dark)"/>
      <ellipse cx="9.2" cy="10" rx="2.2" ry="2.5" fill="var(--bg-dark)"/>
      <ellipse cx="14.8" cy="10" rx="2.2" ry="2.5" fill="var(--bg-dark)"/>
    </svg>
  )
}

/**
 * CSS-rendered 2D dice face showing skull icons in standard dot positions.
 * Used in the HUD, column selector, and score panels.
 */
export function DiceDisplay({ value, size = 72, glow = false, className = '' }) {
  const positions = SKULL_POSITIONS[value] ?? []
  const iconSize = size <= 48 ? 10 : size <= 64 ? 13 : 16

  return (
    <div
      className={`${styles.dice} ${glow ? styles.glow : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Dado: ${value}`}
    >
      {positions.map(([px, py], i) => (
        <span
          key={i}
          className={styles.skull}
          style={{
            left: `${px}%`,
            top: `${py}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <SkullIcon size={iconSize} />
        </span>
      ))}
    </div>
  )
}
