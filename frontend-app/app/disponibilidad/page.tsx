import type { Metadata } from 'next'
import { SalaGrid } from '@/components/organisms'

export const metadata: Metadata = {
  title: 'Disponibilidad de Salas — TurnoMonitores',
  description: 'Consulta en tiempo real la disponibilidad de salas de monitoría por sede — Universidad de Caldas',
}

export default function DisponibilidadPage() {
  return (
    <main className="page-main">
      <SalaGrid />
    </main>
  )
}
