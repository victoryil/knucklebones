import { useState } from 'react'
import { DiceDisplay } from '@/components/game/DiceDisplay.jsx'
import styles from './TutorialScreen.module.css'

// ── Scripted tutorial steps ────────────────────────────────────────────────
// Each step defines:
//   boards       — [player0Board, player1Board], each is [[c0],[c1],[c2]]
//   roll         — current die value shown in center (null = none)
//   highlight    — 'roll' | 'place' | 'col0'|'col1'|'col2' | 'opp-col0' | null
//   title        — heading text
//   text         — explanation paragraph
//   note         — optional extra callout (e.g. score tip)

const NULL_COL = [null, null, null]
const EMPTY    = [NULL_COL, NULL_COL, NULL_COL]

const STEPS = [
  {
    boards: [EMPTY, EMPTY],
    roll: null,
    highlight: null,
    title: '¡Bienvenido a Knucklebones!',
    text: 'Tu tablero está en la parte inferior y el de tu rival en la parte superior. Cada tablero tiene 3 columnas con espacio para 3 dados.',
    note: null,
  },
  {
    boards: [EMPTY, EMPTY],
    roll: null,
    highlight: 'roll',
    title: 'Tirar el dado',
    text: 'Cada turno empieza pulsando el botón "Tirar dado". Obtendrás un número del 1 al 6 de forma aleatoria.',
    note: null,
  },
  {
    boards: [EMPTY, EMPTY],
    roll: 3,
    highlight: 'roll',
    title: '¡Has sacado un 3!',
    text: 'El dado aparece en el centro. Ahora debes elegir en qué columna colocarlo.',
    note: null,
  },
  {
    boards: [[[3, null, null], NULL_COL, NULL_COL], EMPTY],
    roll: null,
    highlight: 'col0',
    title: 'Colocar el dado',
    text: 'Has colocado el 3 en la columna 1. Los dados se apilan desde abajo: el primero ocupa la posición inferior, el tercero la superior.',
    note: '💡 El 3 vale 3 puntos.',
  },
  {
    boards: [[[3, 3, null], NULL_COL, NULL_COL], EMPTY],
    roll: null,
    highlight: 'col0',
    title: 'Combinación ×2 — ¡Dorado!',
    text: 'Al colocar otro 3 en la misma columna, los dos se multiplican entre sí. Dos dados iguales valen (3+3) × 2 = 12 puntos.',
    note: '🟡 El dado se vuelve dorado cuando hay 2 iguales.',
  },
  {
    boards: [[[3, 3, 3], NULL_COL, NULL_COL], EMPTY],
    roll: null,
    highlight: 'col0',
    title: 'Combinación ×3 — ¡Azul!',
    text: '¡Tres 3s en la misma columna! Ahora valen (3+3+3) × 3 = 27 puntos. ¡Una columna llena de iguales es devastadora!',
    note: '🔵 Tres iguales se vuelven azules. ¡El máximo es 6+6+6 = 162 por columna!',
  },
  {
    boards: [
      [[3, null, null], NULL_COL, NULL_COL],
      [[[3, 3, null], NULL_COL, NULL_COL][0], NULL_COL, NULL_COL],
    ],
    roll: 3,
    highlight: 'opp-col0',
    title: 'Destrucción de dados',
    text: 'El rival tiene dos 3s en la columna 1. Si colocas tu 3 también en la columna 1... ¡destruyes todos sus 3s de esa columna!',
    note: '💥 La destrucción funciona en ambos sentidos: el rival también puede destruir los tuyos.',
  },
  {
    boards: [
      [[3, 3, null], NULL_COL, NULL_COL],
      [EMPTY[0], NULL_COL, NULL_COL],
    ],
    roll: null,
    highlight: 'opp-col0',
    title: '¡Destruidos!',
    text: 'Los dos 3s del rival han desaparecido de su columna 1. Tú ahora tienes dos 3s y el rival no tiene nada. ¡Un giro total de puntuación!',
    note: null,
  },
  {
    boards: [
      [[5, 5, 5], [6, 6, null], [3, 4, 2]],
      [[1, 2, 3], [4, 4, 1],    [6, 5, 3]],
    ],
    roll: null,
    highlight: null,
    title: 'Fin de la partida',
    text: 'La partida termina cuando uno de los dos llena completamente su tablero (9 dados). Quien tenga más puntos gana. ¡La estrategia está en construir combos y destruir los del rival!',
    note: null,
  },
]

// ── Mini board renderer ────────────────────────────────────────────────────
const SLOT_ORDER = {
  0: [0, 1, 2],  // player: slot 0 at top (nearest divider)
  1: [2, 1, 0],  // opponent: slot 0 at bottom (nearest divider)
}

function MiniBoard({ board, playerIndex, highlightCol }) {
  const order = SLOT_ORDER[playerIndex]
  return (
    <div className={styles.miniBoard}>
      {board.map((col, ci) => {
        const isHighlighted = highlightCol === ci
        return (
          <div
            key={ci}
            className={`${styles.miniCol} ${isHighlighted ? styles.miniColHl : ''} ${playerIndex === 0 ? styles.miniColP0 : styles.miniColP1}`}
          >
            {order.map(si => {
              const val = col[si]
              const combo = val !== null ? col.filter(v => v === val).length : 1
              return (
                <div
                  key={si}
                  className={`${styles.miniCell} ${playerIndex === 0 ? styles.miniCellP0 : styles.miniCellP1}`}
                >
                  {val !== null && <DiceDisplay value={val} size={34} combo={combo} />}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── TutorialScreen ─────────────────────────────────────────────────────────
export function TutorialScreen({ onBack, onPlay }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Resolve column highlight for each board
  const playerHighlight = s.highlight === 'col0' ? 0
    : s.highlight === 'col1' ? 1
    : s.highlight === 'col2' ? 2 : null
  const oppHighlight = s.highlight === 'opp-col0' ? 0
    : s.highlight === 'opp-col1' ? 1
    : s.highlight === 'opp-col2' ? 2 : null

  return (
    <div className={styles.screen}>
      {/* Progress dots */}
      <div className={styles.progress}>
        {STEPS.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`}
            onClick={() => setStep(i)}
            aria-label={`Paso ${i + 1}`}
          />
        ))}
      </div>

      {/* Game preview */}
      <div className={styles.preview}>
        {/* Opponent board */}
        <div className={styles.previewSection}>
          <span className={styles.playerLabel}>Rival</span>
          <MiniBoard board={s.boards[1]} playerIndex={1} highlightCol={oppHighlight} />
        </div>

        {/* Central strip: scores + die */}
        <div className={styles.central}>
          <div className={styles.centralDie}>
            {s.roll !== null ? (
              <DiceDisplay value={s.roll} size={48} glow />
            ) : (
              <div className={`${styles.rollPlaceholder} ${s.highlight === 'roll' ? styles.rollHighlight : ''}`}>
                {s.highlight === 'roll' ? '↓ Tirar' : '—'}
              </div>
            )}
          </div>
        </div>

        {/* Player board */}
        <div className={styles.previewSection}>
          <MiniBoard board={s.boards[0]} playerIndex={0} highlightCol={playerHighlight} />
          <span className={styles.playerLabel}>Tú</span>
        </div>
      </div>

      {/* Explanation card */}
      <div className={styles.card}>
        <div className={styles.stepBadge}>{step + 1} / {STEPS.length}</div>
        <h2 className={styles.cardTitle}>{s.title}</h2>
        <p className={styles.cardText}>{s.text}</p>
        {s.note && <p className={styles.cardNote}>{s.note}</p>}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        <button
          className={styles.navSecondary}
          onClick={step === 0 ? onBack : () => setStep(step - 1)}
        >
          {step === 0 ? '← Volver' : '← Anterior'}
        </button>

        {isLast ? (
          <button className={styles.navPrimary} onClick={onPlay}>
            ¡Jugar! ▶
          </button>
        ) : (
          <button className={styles.navPrimary} onClick={() => setStep(step + 1)}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  )
}
