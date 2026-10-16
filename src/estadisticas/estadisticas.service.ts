import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EstadisticasService {
  constructor(private readonly db: DatabaseService) {}

  async obtenerMetricasDashboard() {
    try {
      // 1. Total general de reportes activos
      const queryTotal = `SELECT COUNT(id_reporte) AS total FROM reporte WHERE activo = 1;`;

      // 2. Reportes agrupados por tipo de fraude (para la gráfica de pastel)
      const queryCategorias = `
        SELECT ctf.id_tipo_fraude, ctf.nombre_tipo, COUNT(r.id_reporte) AS total
        FROM cat_tipo_fraude ctf
        LEFT JOIN reporte r ON ctf.id_tipo_fraude = r.id_tipo_fraude AND r.activo = 1
        GROUP BY ctf.id_tipo_fraude, ctf.nombre_tipo;
      `;

      // 3. Reportes agrupados por estado (para la gráfica de barras)
      const queryEstados = `
        SELECT cer.id_estado_reporte, cer.nombre_estado, COUNT(r.id_reporte) AS total
        FROM cat_estado_reporte cer
        LEFT JOIN reporte r ON cer.id_estado_reporte = r.id_estado_actual AND r.activo = 1
        GROUP BY cer.id_estado_reporte, cer.nombre_estado;
      `;

      // Lo corremos en paralelo para que vaya más rápido
      const [totalResult, porCategoria, porEstado] = await Promise.all([
        this.db.query(queryTotal),
        this.db.query(queryCategorias),
        this.db.query(queryEstados)
      ]);

      // Armamos el objeto como lo espera el front (interfaz Dashboard de api.ts)
      return {
        total_reportes: (totalResult as any)[0]?.total || 0,
        por_categoria: porCategoria,
        por_estado: porEstado
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las estadísticas del dashboard');
    }
  }
}