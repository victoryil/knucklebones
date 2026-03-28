import styles from './Button.module.css'

export function Button({ children, variant = 'primary', disabled, onClick, className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${disabled ? styles.disabled : ''} ${className}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </button>
  )
}
