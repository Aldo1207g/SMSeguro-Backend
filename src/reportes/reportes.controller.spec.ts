process.env.JWT_SECRET = 'clave-secreta-jest-smseguro';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ReportesRepository } from './reportes.repository';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { sign } from '../auth/jwt';

describe('ReportesController (HTTP con mocks, sin MySQL)', () => {
  let app: INestApplication<App>;

  // Simula lo que devolvería MySQL (no se necesita BD para estas pruebas)
  const repositorioFalso = {
    listarPorUsuario: jest.fn(),
    listarPendientes: jest.fn(),
    conteoPorCategoriaYEstado: jest.fn(),
  };

  const tokenCiudadano = sign(
    { sub: 7, email: 'ciudadano@smseguro.com', rol: 'Ciudadano', type: 'access' },
    60,
  );
  const tokenAnalista = sign(
    { sub: 1, email: 'analista@smseguro.com', rol: 'Analista', type: 'access' },
    60,
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        ReportesService,
        AuthGuard,
        RolesGuard,
        { provide: ReportesRepository, useValue: repositorioFalso },
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

  describe('CP01_HU05 - Consultar mis reportes', () => {
    beforeEach(() => {
      repositorioFalso.listarPorUsuario.mockResolvedValue([
        {
          id_reporte: 10,
          titulo: 'Phishing',
          descripcion: 'Me llegó un SMS del banco con un enlace raro',
          url: 'https://banco-falso.com/login',
          telefono: '',
          fecha_creacion: '2026-10-01',
          id_estado_actual: 1,
          nombre_estado: 'Pendiente',
          reportado_por: 'ciudadano',
          mismo_caso_total: '0',
        },
        {
          id_reporte: 11,
          titulo: 'Smishing',
          descripcion: 'Número que pide un depósito urgente',
          url: '',
          telefono: '+52 55 8765 4321',
          fecha_creacion: '2026-10-02',
          id_estado_actual: 2,
          nombre_estado: 'Aprobado',
          reportado_por: 'ciudadano',
          mismo_caso_total: '3',
        },
      ]);
    });

    it('responde 200 y un arreglo con los 2 reportes del ciudadano', async () => {
      const res = await request(app.getHttpServer())
        .get('/reportes/mis-reportes')
        .set('Authorization', `Bearer ${tokenCiudadano}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        id_reporte: 10,
        titulo: 'Phishing',
        nombre_estado: 'Pendiente',
        mismo_caso_total: 0,
      });
      expect(res.body[1]).toMatchObject({
        id_reporte: 11,
        telefono: '+52 55 8765 4321',
        nombre_estado: 'Aprobado',
        mismo_caso_total: 3,
      });
      // El id del usuario sale del token, no de la petición
      expect(repositorioFalso.listarPorUsuario).toHaveBeenCalledWith(7);
    });

    it('responde 401 sin token', async () => {
      await request(app.getHttpServer()).get('/reportes/mis-reportes').expect(401);
      expect(repositorioFalso.listarPorUsuario).not.toHaveBeenCalled();
    });
  });

  describe('CP03_HU07 - Bandeja de reportes pendientes', () => {
    beforeEach(() => {
      repositorioFalso.listarPendientes.mockResolvedValue([
        {
          id_reporte: 21,
          titulo: 'Phishing',
          descripcion: 'Correo que suplanta al SAT',
          url: 'https://sat-pagos.info/pago',
          telefono: '+52 55 1234 5678',
          fecha_creacion: '2026-10-03',
          reportado_por: 'ciudadano',
          id_estado_actual: 1,
        },
        {
          id_reporte: 22,
          titulo: 'Smishing',
          descripcion: 'SMS de paquetería falsa',
          url: 'https://paquete-retenido.mx',
          fecha_creacion: '2026-10-04',
          reportado_por: 'otro_usuario',
          id_estado_actual: 1,
        },
      ]);
    });

    it('responde 200 con los reportes en estado Pendiente (1) para un Analista', async () => {
      const res = await request(app.getHttpServer())
        .get('/reportes/pendientes')
        .set('Authorization', `Bearer ${tokenAnalista}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.map((r: { id_reporte: number }) => r.id_reporte)).toEqual(
        [21, 22],
      );
      expect(res.body[0]).toEqual({
        id_reporte: 21,
        titulo: 'Phishing',
        descripcion: 'Correo que suplanta al SAT',
        url: 'https://sat-pagos.info/pago',
        telefono: '+52 55 1234 5678',
        fecha_creacion: '2026-10-03',
        reportado_por: 'ciudadano',
      });
      expect(repositorioFalso.listarPendientes).toHaveBeenCalledTimes(1);
    });

    it('responde 403 con token de Ciudadano', async () => {
      await request(app.getHttpServer())
        .get('/reportes/pendientes')
        .set('Authorization', `Bearer ${tokenCiudadano}`)
        .expect(403);
      expect(repositorioFalso.listarPendientes).not.toHaveBeenCalled();
    });
  });

  describe('CP04_HU09 - Dashboard de estadísticas', () => {
    beforeEach(() => {
      repositorioFalso.conteoPorCategoriaYEstado.mockResolvedValue([
        {
          id_tipo_fraude: 1,
          nombre_tipo: 'Phishing',
          id_estado_reporte: 1,
          nombre_estado: 'Pendiente',
          total: '2',
        },
        {
          id_tipo_fraude: 1,
          nombre_tipo: 'Phishing',
          id_estado_reporte: 2,
          nombre_estado: 'Aprobado',
          total: '3',
        },
        {
          id_tipo_fraude: 2,
          nombre_tipo: 'Smishing',
          id_estado_reporte: 1,
          nombre_estado: 'Pendiente',
          total: '1',
        },
      ]);
    });

    it('responde 200 con total_reportes, por_categoria, por_estado y detalle para un Analista', async () => {
      const res = await request(app.getHttpServer())
        .get('/reportes/estadisticas/dashboard')
        .set('Authorization', `Bearer ${tokenAnalista}`)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          total_reportes: expect.any(Number),
          por_categoria: expect.any(Array),
          por_estado: expect.any(Array),
          detalle: expect.any(Array),
        }),
      );
      expect(res.body.total_reportes).toBe(6);
      expect(res.body.detalle).toHaveLength(3);
      expect(res.body.por_categoria).toEqual([
        { id_tipo_fraude: 1, nombre_tipo: 'Phishing', total: 5 },
        { id_tipo_fraude: 2, nombre_tipo: 'Smishing', total: 1 },
      ]);
      expect(res.body.por_estado).toEqual([
        { id_estado_reporte: 1, nombre_estado: 'Pendiente', total: 3 },
        { id_estado_reporte: 2, nombre_estado: 'Aprobado', total: 3 },
      ]);
    });

    it('responde 401 sin token', async () => {
      await request(app.getHttpServer())
        .get('/reportes/estadisticas/dashboard')
        .expect(401);
      expect(repositorioFalso.conteoPorCategoriaYEstado).not.toHaveBeenCalled();
    });
  });
});
