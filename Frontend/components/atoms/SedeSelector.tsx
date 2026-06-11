import type { SedeSlug, SedeOption } from '../types/sala'
import { SEDES } from '../types/sala'
import styles from './SedeSelector.module.css'

interface Props {
  value: SedeSlug
  onChange: (sede: SedeSlug) => void
}

export function SedeSelector({ value, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor="sede-select" className={styles.label}>
        Sede
      </label>
      <select
        id="sede-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SedeSlug)}
        className={styles.select}
      >
        {SEDES.map((sede: SedeOption) => (
          <option key={sede.slug} value={sede.slug}>
            {sede.label}
          </option>
        ))}
      </select>
    </div>
  )
}
