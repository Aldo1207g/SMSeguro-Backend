import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresRepository } from './indicadores.repository';
import { AuthGuard } from '../auth/auth.guard';
import { sign } from '../auth/jwt';

describe('GET /indicadores/exportar', () => {
  let app: INestApplication<App>;

  // Simula lo que devolvería MySQL (no se necesita BD para este test)
  const repositorioFalso = {
    listaNegra: jest.fn().mockResolvedValue([
      {
        tipo_dato: 'Telefono',
        valor_dato: '+52 55 8765 4321',
        reportes_aprobados: 2,
        ultima_confirmacion: '2026-10-01 10:00:00',
      },
      {
        tipo_dato: 'URL',
        valor_dato: 'https://sat-pagos.info/pago?ref=A1,B2',
        reportes_aprobados: 1,
        ultima_confirmacion: '2026-10-01 11:00:00',
      },
      {
        tipo_dato: 'URL',
        valor_dato: '=HYPERLINK("http://malo.com")',
        reportes_aprobados: 1,
        ultima_confirmacion: '2026-10-01 12:00:00',
      },
    ]),
  };

  const token = sign(
    { sub: 1, email: 'analista@smseguro.com', rol: 'Analista', type: 'access' },
    60,
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [IndicadoresController],
      providers: [
        IndicadoresService,
        AuthGuard,
        { provide: IndicadoresRepository, useValue: repositorioFalso },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 401 sin token', async () => {
    await request(app.getHttpServer()).get('/indicadores/exportar').expect(401);
  });

  it('descarga un CSV con encabezados y escapado correcto', async () => {
    const res = await request(app.getHttpServer())
      .get('/indicadores/exportar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="lista_negra.csv"',
    );

    const lineas = res.text.replace('﻿', '').split('\n');
    expect(lineas[0]).toBe(
      'tipo_dato,valor_dato,reportes_aprobados,ultima_confirmacion',
    );
    // Teléfono con "+" se queda intacto
    expect(lineas[1]).toBe('Telefono,+52 55 8765 4321,2,2026-10-01 10:00:00');
    // URL con coma va entre comillas
    expect(lineas[2]).toBe(
      'URL,"https://sat-pagos.info/pago?ref=A1,B2",1,2026-10-01 11:00:00',
    );
    // Fórmula neutralizada con ' y comillas internas duplicadas
    expect(lineas[3]).toBe(
      'URL,"\'=HYPERLINK(""http://malo.com"")",1,2026-10-01 12:00:00',
    );
  });
});
