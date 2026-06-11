import type { Sala, SedeSlug } from '../components/types/sala'
import { MOCK_SALAS } from '../data/mockSalas'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchSalas(sede: SedeSlug): Promise<Sala[]> {
  if (!API_URL) return structuredClone(MOCK_SALAS[sede])

  const res = await fetch(`${API_URL}/salas/${sede}`, { cache: 'no-store' })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  return res.json() as Promise<Sala[]>
}
