import { t } from '@/i18n/index.js'
import styles from './PauseOverlay.module.css'

export function PauseOverlay({ onResume, onSettings, onSurrender, onMenu }) {
  return (
    <div className={styles.overlay} onClick={onResume}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{t('pause.title')}</h2>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onResume}>{t('pause.resume')}</button>
          <button className={styles.btn} onClick={onSettings}>{t('pause.settings')}</button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onSurrender}>{t('pause.surrender')}</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onMenu}>{t('pause.menu')}</button>
        </div>
      </div>
    </div>
  )
}
