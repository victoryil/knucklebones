import { useEffect } from 'react'
import styles from './InfoModal.module.css'

export function InfoModal({ onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Reglas del juego">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>

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
            <p>El valor de cada columna se calcula por grupos de dados con el mismo número:</p>
            <table className={styles.table}>
              <thead>
                <tr><th>Dados iguales</th><th>Fórmula</th><th>Ejemplo (valor 3)</th></tr>
              </thead>
              <tbody>
                <tr><td>1 dado</td><td>valor × 1</td><td>3</td></tr>
                <tr><td className={styles.gold}>2 dados <span>⬛⬛</span></td><td>valor × 4</td><td>12</td></tr>
                <tr><td className={styles.blue}>3 dados <span>⬛⬛⬛</span></td><td>valor × 9</td><td>27</td></tr>
              </tbody>
            </table>
            <p className={styles.hint}>
              Los dados <span className={styles.goldText}>dorados</span> tienen ×4 y los{' '}
              <span className={styles.blueText}>azules</span> tienen ×9.
            </p>
          </section>

          <section className={styles.section}>
            <h3>Fin del juego</h3>
            <p>La partida acaba cuando un jugador llena su tablero (9 dados colocados). Gana quien tenga más puntos.</p>
          </section>
        </div>

        <p className={styles.disclaimer}>
          Fan project · Knucklebones © Massive Monster / Devolver Digital
        </p>
      </div>
    </div>
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
