process.env.JWT_SECRET = 'clave-secreta-jest-smseguro';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresRepository } from './indicadores.repository';
import { DatabaseService } from '../database/database.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { sign } from '../auth/jwt';

describe('IndicadoresController (HTTP con mocks, sin MySQL)', () => {
  let app: INestApplication<App>;

  const TELEFONO_REPORTADO = '+52 55 8765 4321';

  // Simula lo que devolvería MySQL (no se necesita BD para estas pruebas)
  const repositorioFalso = {
    buscarAmenaza: jest.fn(),
    listaNegra: jest.fn(),
  };

  const tokenAnalista = sign(
    { sub: 1, email: 'analista@smseguro.com', rol: 'Analista', type: 'access' },
    60,
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [IndicadoresController],
      providers: [
        IndicadoresService,
        AuthGuard,
        RolesGuard,
        { provide: IndicadoresRepository, useValue: repositorioFalso },
        { provide: DatabaseService, useValue: { query: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CP02_HU06 - Buscar indicador', () => {
    beforeEach(() => {
      repositorioFalso.buscarAmenaza.mockImplementation((valor: string) =>
        Promise.resolve(
          valor === TELEFONO_REPORTADO
            ? { total_reportes: 2, aprobados: 2, rechazados: 0 }
            : { total_reportes: 0, aprobados: 0, rechazados: 0 },
        ),
      );
    });

    it('responde 200 con encontrado: true para un teléfono ya reportado', async () => {
      const res = await request(app.getHttpServer())
        .get('/indicadores/buscar?valor=%2B52%2055%208765%204321')
        .expect(200);

      expect(res.body).toMatchObject({
        encontrado: true,
        total_reportes: 2,
        aprobados: 2,
        rechazados: 0,
      });
      expect(repositorioFalso.buscarAmenaza).toHaveBeenCalledWith(
        TELEFONO_REPORTADO,
      );
    });

    it('responde 200 con encontrado: false para un valor inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/indicadores/buscar?valor=https%3A%2F%2Fno-existe.example.com')
        .expect(200);

      expect(res.body).toMatchObject({
        encontrado: false,
        total_reportes: 0,
        aprobados: 0,
        rechazados: 0,
      });
    });
  });

  describe('CP05_HU12 - Exportar lista negra', () => {
    beforeEach(() => {
      repositorioFalso.listaNegra.mockResolvedValue([
        {
          tipo_dato: 'Telefono',
          valor_dato: TELEFONO_REPORTADO,
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
      ]);
    });

    it('responde 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/indicadores/exportar-lista-negra')
        .expect(401);
      expect(repositorioFalso.listaNegra).not.toHaveBeenCalled();
    });

    it('con token de Analista responde 200 con un CSV de encabezados correctos y fórmulas neutralizadas', async () => {
      const res = await request(app.getHttpServer())
        .get('/indicadores/exportar-lista-negra')
        .set('Authorization', `Bearer ${tokenAnalista}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');

      // El CSV empieza con BOM UTF-8 (para Excel); lo quitamos para comparar
      const lineas = res.text.replace(/^\uFEFF/, '').split('\n');
      expect(lineas[0]).toBe(
        'tipo_dato,valor_dato,reportes_aprobados,ultima_confirmacion',
      );
      // El teléfono con "+" se neutraliza con comilla simple
      expect(lineas[1]).toBe(
        "Telefono,'+52 55 8765 4321,2,2026-10-01 10:00:00",
      );
      // La URL con coma va entre comillas
      expect(lineas[2]).toBe(
        'URL,"https://sat-pagos.info/pago?ref=A1,B2",1,2026-10-01 11:00:00',
      );
      // La fórmula se neutraliza con ' y las comillas internas se duplican
      expect(lineas[3]).toBe(
        'URL,"\'=HYPERLINK(""http://malo.com"")",1,2026-10-01 12:00:00',
      );
    });
  });
});
