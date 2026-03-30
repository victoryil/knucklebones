import { t } from '@/i18n/index.js'
import styles from './ReconnectOverlay.module.css'

export function ReconnectOverlay({ attempt, maxAttempts, onAbandon }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.spinner} aria-hidden="true" />
        <h2 className={styles.title}>{t('reconnect.title')}</h2>
        <p className={styles.status}>{t('reconnect.trying')}</p>
        {attempt > 0 && (
          <p className={styles.attempt}>
            {t('reconnect.attempt')
              .replace('{n}',   attempt)
              .replace('{max}', maxAttempts)}
          </p>
        )}
        <button className={styles.abandonBtn} onClick={onAbandon}>
          {t('reconnect.abandon')}
        </button>
      </div>
    </div>
  )
}
