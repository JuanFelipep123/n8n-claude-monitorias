import type { Sala, SedeSlug } from '../types/sala'
import { SalaCard } from '../atoms/SalaCard'
import styles from './SalaCardGrid.module.css'

interface Props {
  salas: Sala[]
  sede: SedeSlug
}

export function SalaCardGrid({ salas, sede }: Props) {
  return (
    <div className={styles.grid} role="list" aria-label="Disponibilidad de salas">
      {salas.map((sala) => (
        <div key={sala.id} role="listitem">
          <SalaCard sala={sala} showExternosIndicator={sede === 'lans'} />
        </div>
      ))}
    </div>
  )
}
