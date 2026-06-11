import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SEDES = [
  { id: 'a1b2c3d4-0000-0000-0000-000000000001', slug: 'lans',           nombre: 'Sede Lans',          hora_apertura: '07:00', hora_cierre: '15:00' },
  { id: 'a1b2c3d4-0000-0000-0000-000000000002', slug: 'orlando-sierra', nombre: 'Sede Orlando Sierra', hora_apertura: '07:00', hora_cierre: '18:00' },
];

const SALAS_MOCK = [
  { id: '11111111-0000-0000-0000-000000000001', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 101', permite_externos: true,  estado: 'libre' },
  { id: '11111111-0000-0000-0000-000000000002', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 102', permite_externos: true,  estado: 'en_clase' },
  { id: '11111111-0000-0000-0000-000000000003', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 103', permite_externos: true,  estado: 'con_monitor' },
  { id: '11111111-0000-0000-0000-000000000004', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 104', permite_externos: true,  estado: 'libre' },
  { id: '11111111-0000-0000-0000-000000000005', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 105', permite_externos: true,  estado: 'cerrada' },
  { id: '11111111-0000-0000-0000-000000000006', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Sala 106', permite_externos: true,  estado: 'libre' },
  { id: '11111111-0000-0000-0000-000000000007', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Lab A',    permite_externos: false, estado: 'libre' },
  { id: '11111111-0000-0000-0000-000000000008', sede_id: 'a1b2c3d4-0000-0000-0000-000000000001', nombre: 'Lab B',    permite_externos: false, estado: 'cerrada' },
  { id: '22222222-0000-0000-0000-000000000001', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 201', permite_externos: true,  estado: 'libre' },
  { id: '22222222-0000-0000-0000-000000000002', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 202', permite_externos: true,  estado: 'en_clase' },
  { id: '22222222-0000-0000-0000-000000000003', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 203', permite_externos: true,  estado: 'libre' },
  { id: '22222222-0000-0000-0000-000000000004', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 204', permite_externos: true,  estado: 'con_monitor' },
  { id: '22222222-0000-0000-0000-000000000005', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 205', permite_externos: true,  estado: 'libre' },
  { id: '22222222-0000-0000-0000-000000000006', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 206', permite_externos: true,  estado: 'cerrada' },
  { id: '22222222-0000-0000-0000-000000000007', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 207', permite_externos: true,  estado: 'libre' },
  { id: '22222222-0000-0000-0000-000000000008', sede_id: 'a1b2c3d4-0000-0000-0000-000000000002', nombre: 'Sala 208', permite_externos: true,  estado: 'en_clase' },
];

export function isSedeValida(sede: string): boolean {
  return SEDES.some(s => s.slug === sede);
}

export function isFueraDeHorario(horaApertura: string, horaCierre: string): boolean {
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  const ahora = h * 60 + m;

  const toMin = (t: string) => {
    const [th, tm] = t.split(':').map(Number);
    return th * 60 + tm;
  };

  return ahora < toMin(horaApertura) || ahora >= toMin(horaCierre);
}

@Injectable()
export class SalasService {
  private readonly supabase: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    const useMock = process.env.USE_MOCK === 'true';

    this.supabase = !useMock && url && key ? createClient(url, key) : null;
  }

  async getSalasBySede(sede: string) {
    if (!isSedeValida(sede)) {
      throw new BadRequestException(
        `Sede '${sede}' no reconocida. Valores válidos: lans, orlando-sierra.`,
      );
    }

    const config = SEDES.find(s => s.slug === sede)!;
    const fueraDeHorario = isFueraDeHorario(config.hora_apertura, config.hora_cierre);

    const salas = this.supabase
      ? await this.fetchFromSupabase(config.id).catch(() => this.mockForSede(config.id))
      : this.mockForSede(config.id);

    if (fueraDeHorario) {
      return salas.map(s => ({ ...s, estado: 'cerrada' }));
    }

    return salas;
  }

  private mockForSede(sedeId: string) {
    const now = new Date().toISOString();
    return SALAS_MOCK
      .filter(s => s.sede_id === sedeId)
      .map(s => ({
        id: s.id,
        nombre: s.nombre,
        estado: s.estado,
        permiteExternos: s.permite_externos,
        updatedAt: now,
      }));
  }

  private async fetchFromSupabase(sedeId: string) {
    const { data, error } = await this.supabase!
      .from('salas')
      .select('id, nombre, estado, permite_externos, updated_at')
      .eq('sede_id', sedeId);

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: r.id,
      nombre: r.nombre,
      estado: r.estado,
      permiteExternos: r.permite_externos,
      updatedAt: r.updated_at,
    }));
  }
}
