import type { Sala, SedeSlug } from '@/components/types/sala'

export const MOCK_SALAS: Record<SedeSlug, Sala[]> = {
  lans: [
    { id: '11111111-0000-0000-0000-000000000001', nombre: 'Sala 101', estado: 'libre',       permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000002', nombre: 'Sala 102', estado: 'en_clase',    permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000003', nombre: 'Sala 103', estado: 'con_monitor', permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000004', nombre: 'Sala 104', estado: 'cerrada',     permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000005', nombre: 'Sala 105', estado: 'libre',       permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000006', nombre: 'Sala 106', estado: 'libre',       permiteExternos: true,  updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000007', nombre: 'Lab A',    estado: 'libre',       permiteExternos: false, updatedAt: new Date().toISOString() },
    { id: '11111111-0000-0000-0000-000000000008', nombre: 'Lab B',    estado: 'cerrada',     permiteExternos: false, updatedAt: new Date().toISOString() },
  ],
  'orlando-sierra': [
    { id: '22222222-0000-0000-0000-000000000001', nombre: 'Sala 201', estado: 'libre',       permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000002', nombre: 'Sala 202', estado: 'en_clase',    permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000003', nombre: 'Sala 203', estado: 'libre',       permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000004', nombre: 'Sala 204', estado: 'con_monitor', permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000005', nombre: 'Sala 205', estado: 'libre',       permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000006', nombre: 'Sala 206', estado: 'cerrada',     permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000007', nombre: 'Sala 207', estado: 'libre',       permiteExternos: true, updatedAt: new Date().toISOString() },
    { id: '22222222-0000-0000-0000-000000000008', nombre: 'Sala 208', estado: 'en_clase',    permiteExternos: true, updatedAt: new Date().toISOString() },
  ],
}
