import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('SalasController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.USE_MOCK = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.USE_MOCK;
  });

  it('GET /salas/lans → 200 con 8 salas', () =>
    request(app.getHttpServer())
      .get('/salas/lans')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(8);
      }));

  it('GET /salas/orlando-sierra → 200 con 8 salas', () =>
    request(app.getHttpServer())
      .get('/salas/orlando-sierra')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(8);
      }));

  it('GET /salas/lans → shape correcta en cada sala', () =>
    request(app.getHttpServer())
      .get('/salas/lans')
      .expect(200)
      .expect(res => {
        res.body.forEach((sala: any) => {
          expect(sala).toHaveProperty('id');
          expect(sala).toHaveProperty('nombre');
          expect(sala).toHaveProperty('estado');
          expect(sala).toHaveProperty('permiteExternos');
          expect(sala).toHaveProperty('updatedAt');
        });
      }));

  it('GET /salas/lans → estados son valores del enum', () =>
    request(app.getHttpServer())
      .get('/salas/lans')
      .expect(200)
      .expect(res => {
        const ESTADOS = ['libre', 'en_clase', 'con_monitor', 'cerrada'];
        res.body.forEach((s: any) => expect(ESTADOS).toContain(s.estado));
      }));

  it('GET /salas/xyz → 400 con mensaje correcto', () =>
    request(app.getHttpServer())
      .get('/salas/xyz')
      .expect(400)
      .expect(res => {
        expect(res.body.statusCode).toBe(400);
        expect(res.body.message).toContain("Sede 'xyz' no reconocida");
        expect(res.body.error).toBe('Bad Request');
      }));

  it('GET /salas/LANS → 400 (case-sensitive)', () =>
    request(app.getHttpServer())
      .get('/salas/LANS')
      .expect(400));
});
