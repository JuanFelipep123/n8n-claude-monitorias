import { BadRequestException } from '@nestjs/common';
import { isSedeValida, isFueraDeHorario, SalasService } from './salas.service';

describe('isSedeValida', () => {
  it('retorna true para lans', () => {
    expect(isSedeValida('lans')).toBe(true);
  });

  it('retorna true para orlando-sierra', () => {
    expect(isSedeValida('orlando-sierra')).toBe(true);
  });

  it('retorna false para sede desconocida', () => {
    expect(isSedeValida('bogota')).toBe(false);
  });

  it('retorna false para cadena vacía', () => {
    expect(isSedeValida('')).toBe(false);
  });

  it('es case-sensitive — LANS no es válido', () => {
    expect(isSedeValida('LANS')).toBe(false);
  });
});

describe('isFueraDeHorario', () => {
  it('retorna false cuando el rango cubre prácticamente todo el día', () => {
    expect(isFueraDeHorario('00:00', '23:59')).toBe(false);
  });

  it('retorna true cuando el cierre es 00:01 — fuera de rango a cualquier hora normal', () => {
    expect(isFueraDeHorario('00:00', '00:01')).toBe(true);
  });
});

describe('SalasService — modo mock', () => {
  let service: SalasService;

  beforeEach(() => {
    process.env.USE_MOCK = 'true';
    service = new SalasService();
  });

  afterEach(() => {
    delete process.env.USE_MOCK;
  });

  it('retorna 8 salas para lans', async () => {
    const salas = await service.getSalasBySede('lans');
    expect(salas).toHaveLength(8);
  });

  it('retorna 8 salas para orlando-sierra', async () => {
    const salas = await service.getSalasBySede('orlando-sierra');
    expect(salas).toHaveLength(8);
  });

  it('cada sala tiene los cinco campos del contrato', async () => {
    const salas = await service.getSalasBySede('lans');
    salas.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('nombre');
      expect(s).toHaveProperty('estado');
      expect(s).toHaveProperty('permiteExternos');
      expect(s).toHaveProperty('updatedAt');
    });
  });

  it('todos los estados son valores válidos del enum', async () => {
    const ESTADOS = ['libre', 'en_clase', 'con_monitor', 'cerrada'];
    const salas = await service.getSalasBySede('lans');
    salas.forEach(s => expect(ESTADOS).toContain(s.estado));
  });

  it('Lab A y Lab B tienen permiteExternos false', async () => {
    const salas = await service.getSalasBySede('lans');
    const labs = salas.filter(s => s.nombre.startsWith('Lab'));
    expect(labs).toHaveLength(2);
    labs.forEach(l => expect(l.permiteExternos).toBe(false));
  });

  it('el resto de salas de lans tienen permiteExternos true', async () => {
    const salas = await service.getSalasBySede('lans');
    const normales = salas.filter(s => !s.nombre.startsWith('Lab'));
    normales.forEach(s => expect(s.permiteExternos).toBe(true));
  });

  it('lanza BadRequestException para sede inválida', async () => {
    await expect(service.getSalasBySede('xyz')).rejects.toThrow(BadRequestException);
  });

  it('el mensaje del 400 incluye la sede y los valores válidos', async () => {
    await expect(service.getSalasBySede('xyz')).rejects.toThrow(
      "Sede 'xyz' no reconocida. Valores válidos: lans, orlando-sierra.",
    );
  });

  it('fuera de horario sobreescribe todos los estados a cerrada', async () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      formatToParts: () => [
        { type: 'hour', value: '03' },
        { type: 'minute', value: '00' },
      ],
      format: () => '',
      resolvedOptions: () => ({} as any),
    }) as any);

    const salas = await service.getSalasBySede('lans');
    salas.forEach(s => expect(s.estado).toBe('cerrada'));

    jest.restoreAllMocks();
  });
});
