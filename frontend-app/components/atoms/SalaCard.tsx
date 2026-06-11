import type { Sala } from '../types/sala'
import { EstadoBadge } from '../atoms/EstadoBadge'
import styles from './SalaCard.module.css'

interface Props {
  sala: Sala
  showExternosIndicator?: boolean
}

export function SalaCard({ sala, showExternosIndicator = false }: Props) {
  const soloMonitores = showExternosIndicator && !sala.permiteExternos

  return (
    <article className={`${styles.card} ${styles[sala.estado]}`} aria-label={`${sala.nombre} — ${sala.estado}`}>
      <div className={styles.header}>
        <h3 className={styles.nombre}>{sala.nombre}</h3>
        {soloMonitores && (
          <span className={styles.externosBadge} title="Acceso restringido a monitores">
            Solo monitores
          </span>
        )}
      </div>
      <EstadoBadge estado={sala.estado} />
    </article>
  )
}
