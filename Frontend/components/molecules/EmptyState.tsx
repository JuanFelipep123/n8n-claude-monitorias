import styles from './EmptyState.module.css'

interface Props {
  sede: string
}

export function EmptyState({ sede }: Props) {
  return (
    <div className={styles.wrapper} role="status">
      <p className={styles.message}>
        No hay salas registradas para la sede <strong>{sede}</strong>.
      </p>
    </div>
  )
}
