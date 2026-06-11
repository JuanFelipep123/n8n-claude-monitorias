import styles from './ErrorState.module.css'

interface Props {
  onRetry: () => void
}

export function ErrorState({ onRetry }: Props) {
  return (
    <div className={styles.wrapper} role="alert">
      <p className={styles.message}>
        No se pudo cargar la disponibilidad. Intenta de nuevo.
      </p>
      <button id="retry-btn" className={styles.retryBtn} onClick={onRetry} type="button">
        Reintentar
      </button>
    </div>
  )
}
