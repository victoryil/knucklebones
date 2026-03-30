import { useEffect, useState } from 'react'
import styles from './InfoModal.module.css'

export function InfoModal({ onClose }) {
  const [tab, setTab] = useState('rules')   // 'rules' | 'controls'

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'rules' ? styles.tabActive : ''}`}
            onClick={() => setTab('rules')}
          >
            Reglas
          </button>
          <button
            className={`${styles.tab} ${tab === 'controls' ? styles.tabActive : ''}`}
            onClick={() => setTab('controls')}
          >
            🎮 Controles
          </button>
        </div>

        {tab === 'rules' ? <RulesTab /> : <ControlsTab />}

        <p className={styles.disclaimer}>
          Fan project · Knucklebones © Massive Monster / Devolver Digital
        </p>
      </div>
    </div>
  )
}

function RulesTab() {
  return (
    <>
      <h2 className={styles.title}>Reglas de Knucklebones</h2>
      <div className={styles.body}>
        <section className={styles.section}>
          <h3>Objetivo</h3>
          <p>Tener más puntos que el rival cuando uno de los dos llene completamente su tablero.</p>
        </section>

        <section className={styles.section}>
          <h3>Turno</h3>
          <ol>
            <li>Pulsa <strong>Tirar dado</strong> para obtener un número del 1 al 6.</li>
            <li>Elige en qué <strong>columna</strong> colocar el dado (columnas 1, 2 o 3).</li>
            <li>Los dados se apilan: el primero va al fondo, el tercero queda en la cima.</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h3>Destrucción</h3>
          <p>
            Si colocas un dado con el mismo valor que algún dado del rival <em>en la misma columna</em>,
            todos esos dados del rival son destruidos y desaparecen de su tablero.
          </p>
        </section>

        <section className={styles.section}>
          <h3>Puntuación</h3>
          <p>
            Cada grupo de dados iguales en una columna puntúa así:{' '}
            <strong>(suma de sus valores) × cantidad de dados iguales</strong>.
          </p>
          <table className={styles.table}>
            <thead>
              <tr><th>Dados iguales</th><th>Fórmula</th><th>Ejemplo (valor 3)</th></tr>
            </thead>
            <tbody>
              <tr><td>1 dado</td><td>3 × 1</td><td>3</td></tr>
              <tr><td className={styles.gold}>2 dados</td><td>(3+3) × 2</td><td>12</td></tr>
              <tr><td className={styles.blue}>3 dados</td><td>(3+3+3) × 3</td><td>27</td></tr>
            </tbody>
          </table>
          <p className={styles.hint}>
            Los dados <span className={styles.goldText}>dorados</span> se multiplican ×2 y los{' '}
            <span className={styles.blueText}>azules</span> ×3.
          </p>
        </section>

        <section className={styles.section}>
          <h3>Fin del juego</h3>
          <p>La partida acaba cuando un jugador llena su tablero (9 dados colocados). Gana quien tenga más puntos.</p>
        </section>
      </div>
    </>
  )
}

function ControlsTab() {
  return (
    <>
      <h2 className={styles.title}>Soporte de Mando</h2>
      <p className={styles.controlsHint}>Compatible con mando Xbox, PlayStation y Switch Pro.</p>
      <div className={styles.controlsDiagram}>
        <ControllerSvg />
      </div>
      <div className={styles.controlsList}>
        <ControlRow icon="A" label="Tirar dado / Confirmar columna" color="#4CAF50" />
        <ControlRow icon="←→" label="D-pad izq./der. — columna anterior / siguiente" color="#c8860a" />
        <ControlRow icon="LB RB" label="Bumpers — columna anterior / siguiente" color="#c8860a" />
        <ControlRow icon="🕹️" label="Stick izquierdo ←→ — columna anterior / siguiente" color="#c8860a" />
        <ControlRow icon="B" label="Columna siguiente + colocar" color="#c41e3a" />
        <ControlRow icon="X" label="Columna anterior + colocar" color="#4a8fff" />
        <ControlRow icon="Y" label="Colocar en columna seleccionada" color="#d4aa40" />
      </div>
    </>
  )
}

function ControlRow({ icon, label, color }) {
  return (
    <div className={styles.controlRow}>
      <span className={styles.controlIcon} style={{ borderColor: color, color }}>{icon}</span>
      <span className={styles.controlLabel}>{label}</span>
    </div>
  )
}

function ControllerSvg() {
  return (
    <svg
      viewBox="0 0 420 240"
      className={styles.controllerSvg}
      aria-hidden="true"
    >
      {/* ── Controller body ─────────────────────────────────────────── */}
      {/* Main shell */}
      <path
        d="M 100 80
           Q 80 60 60 75
           Q 30 90 35 130
           Q 38 160 55 185
           Q 70 205 95 205
           Q 120 205 135 180
           L 155 155
           Q 175 140 210 138
           Q 245 140 265 155
           L 285 180
           Q 300 205 325 205
           Q 350 205 365 185
           Q 382 160 385 130
           Q 390 90 360 75
           Q 340 60 320 80
           Q 290 65 210 65
           Q 130 65 100 80 Z"
        fill="#1a1a2e"
        stroke="#3a3a5a"
        strokeWidth="2"
      />

      {/* ── Shoulder buttons ──────────────────────────────────────── */}
      {/* LB */}
      <rect x="68" y="58" width="62" height="18" rx="8"
        fill="#252545" stroke="#4a4a7a" strokeWidth="1.5" />
      <text x="99" y="71" textAnchor="middle" fontSize="9" fill="#c8860a" fontWeight="700" fontFamily="sans-serif">LB</text>

      {/* RB */}
      <rect x="290" y="58" width="62" height="18" rx="8"
        fill="#252545" stroke="#4a4a7a" strokeWidth="1.5" />
      <text x="321" y="71" textAnchor="middle" fontSize="9" fill="#c8860a" fontWeight="700" fontFamily="sans-serif">RB</text>

      {/* ── D-pad ─────────────────────────────────────────────────── */}
      {/* Center */}
      <rect x="118" y="118" width="18" height="18" rx="2" fill="#0d0d1a" stroke="#3a3a5a" strokeWidth="1" />
      {/* Left */}
      <rect x="100" y="118" width="18" height="18" rx="2" fill="#c8860a" stroke="#e8a020" strokeWidth="1.5" />
      <text x="109" y="130" textAnchor="middle" fontSize="10" fill="#1a1a2e" fontWeight="900">◀</text>
      {/* Right */}
      <rect x="136" y="118" width="18" height="18" rx="2" fill="#c8860a" stroke="#e8a020" strokeWidth="1.5" />
      <text x="145" y="130" textAnchor="middle" fontSize="10" fill="#1a1a2e" fontWeight="900">▶</text>
      {/* Up */}
      <rect x="118" y="100" width="18" height="18" rx="2" fill="#252545" stroke="#3a3a5a" strokeWidth="1" />
      <text x="127" y="112" textAnchor="middle" fontSize="10" fill="#5a5a8a">▲</text>
      {/* Down */}
      <rect x="118" y="136" width="18" height="18" rx="2" fill="#252545" stroke="#3a3a5a" strokeWidth="1" />
      <text x="127" y="148" textAnchor="middle" fontSize="10" fill="#5a5a8a">▼</text>

      {/* ── Left stick ────────────────────────────────────────────── */}
      <circle cx="170" cy="158" r="16" fill="#0d0d1a" stroke="#3a3a5a" strokeWidth="1.5" />
      <circle cx="170" cy="158" r="9" fill="#1e1e3a" stroke="#4a4a7a" strokeWidth="1" />
      {/* Stick arrows */}
      <text x="160" y="161" fontSize="8" fill="#c8860a" fontWeight="700">◀</text>
      <text x="172" y="161" fontSize="8" fill="#c8860a" fontWeight="700">▶</text>

      {/* ── Start button ──────────────────────────────────────────── */}
      <rect x="198" y="105" width="24" height="12" rx="5"
        fill="#252545" stroke="#5a5a8a" strokeWidth="1" />
      <text x="210" y="114" textAnchor="middle" fontSize="7" fill="#8a8aaa" fontFamily="sans-serif">START</text>

      {/* ── Face buttons ──────────────────────────────────────────── */}
      {/* Y — top */}
      <circle cx="295" cy="105" r="11" fill="#d4aa40" stroke="#f0c850" strokeWidth="1.5" />
      <text x="295" y="109" textAnchor="middle" fontSize="9" fill="#1a1a00" fontWeight="900" fontFamily="sans-serif">Y</text>

      {/* X — left */}
      <circle cx="274" cy="124" r="11" fill="#4a8fff" stroke="#6aafff" strokeWidth="1.5" />
      <text x="274" y="128" textAnchor="middle" fontSize="9" fill="#001040" fontWeight="900" fontFamily="sans-serif">X</text>

      {/* B — right */}
      <circle cx="316" cy="124" r="11" fill="#c41e3a" stroke="#e43a5a" strokeWidth="1.5" />
      <text x="316" y="128" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="900" fontFamily="sans-serif">B</text>

      {/* A — bottom (highlighted, primary action) */}
      <circle cx="295" cy="143" r="13" fill="#4CAF50" stroke="#6fdf70" strokeWidth="2" />
      <text x="295" y="148" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="900" fontFamily="sans-serif">A</text>

      {/* ── Callout lines ─────────────────────────────────────────── */}
      {/* LB/RB → col navigation */}
      <line x1="130" y1="67" x2="12" y2="45" stroke="#c8860a" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="290" y1="67" x2="408" y2="45" stroke="#c8860a" strokeWidth="1" strokeDasharray="3,2" />
      <text x="6" y="43" textAnchor="end" fontSize="8.5" fill="#c8860a" fontFamily="sans-serif">Col ←</text>
      <text x="414" y="43" textAnchor="start" fontSize="8.5" fill="#c8860a" fontFamily="sans-serif">Col →</text>

      {/* D-pad ← → */}
      <line x1="100" y1="127" x2="18" y2="130" stroke="#c8860a" strokeWidth="1" strokeDasharray="3,2" />
      <text x="14" y="133" textAnchor="end" fontSize="8.5" fill="#c8860a" fontFamily="sans-serif">D-pad ←</text>
      <line x1="154" y1="127" x2="402" y2="127" stroke="#c8860a" strokeWidth="1" strokeDasharray="3,2" />
      <text x="406" y="131" textAnchor="start" fontSize="8.5" fill="#c8860a" fontFamily="sans-serif">D-pad →</text>

      {/* Left stick */}
      <line x1="154" y1="158" x2="18" y2="175" stroke="#c8860a" strokeWidth="1" strokeDasharray="3,2" />
      <text x="14" y="178" textAnchor="end" fontSize="8.5" fill="#c8860a" fontFamily="sans-serif">Stick ←→</text>

      {/* A button */}
      <line x1="308" y1="148" x2="408" y2="170" stroke="#4CAF50" strokeWidth="1.2" strokeDasharray="3,2" />
      <text x="412" y="173" textAnchor="start" fontSize="8.5" fill="#4CAF50" fontFamily="sans-serif">Tirar / OK</text>

      {/* B button */}
      <line x1="327" y1="120" x2="408" y2="105" stroke="#c41e3a" strokeWidth="1" strokeDasharray="3,2" />
      <text x="412" y="108" textAnchor="start" fontSize="8.5" fill="#c41e3a" fontFamily="sans-serif">Col → + OK</text>

      {/* X button */}
      <line x1="263" y1="120" x2="18" y2="100" stroke="#4a8fff" strokeWidth="1" strokeDasharray="3,2" />
      <text x="14" y="103" textAnchor="end" fontSize="8.5" fill="#4a8fff" fontFamily="sans-serif">Col ← + OK</text>

      {/* Y button */}
      <line x1="295" y1="94" x2="295" y2="22" stroke="#d4aa40" strokeWidth="1" strokeDasharray="3,2" />
      <text x="295" y="17" textAnchor="middle" fontSize="8.5" fill="#d4aa40" fontFamily="sans-serif">Colocar en col. actual</text>
    </svg>
  )
}

export function InfoButton({ onClick }) {
  return (
    <button
      className={styles.infoBtn}
      onClick={onClick}
      aria-label="Ver reglas del juego"
      title="Reglas"
    >
      i
    </button>
  )
}
