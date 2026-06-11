import type { EstadoSala } from '../types/sala'
import styles from './EstadoBadge.module.css'

const LABEL: Record<EstadoSala, string> = {
  libre:       'Libre',
  en_clase:    'En clase',
  con_monitor: 'Con monitor',
  cerrada:     'Cerrada',
}

interface Props {
  estado: EstadoSala
}

export function EstadoBadge({ estado }: Props) {
  return (
    <span className={`${styles.badge} ${styles[estado]}`}>
      {LABEL[estado]}
    </span>
  )
}
