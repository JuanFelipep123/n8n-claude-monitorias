export type EstadoSala = 'libre' | 'en_clase' | 'con_monitor' | 'cerrada'
export type SedeSlug = 'lans' | 'orlando-sierra'

export interface Sala {
  id: string
  nombre: string
  estado: EstadoSala
  permiteExternos: boolean
  updatedAt: string
}

export interface SedeOption {
  slug: SedeSlug
  label: string
}

export const SEDES: SedeOption[] = [
  { slug: 'lans',            label: 'Sede Lans' },
  { slug: 'orlando-sierra',  label: 'Sede Orlando Sierra' },
]
