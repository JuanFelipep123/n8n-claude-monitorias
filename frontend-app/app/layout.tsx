import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TurnoMonitores — Disponibilidad de Salas',
  description: 'Consulta en tiempo real la disponibilidad de salas de monitoría — Universidad de Caldas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
