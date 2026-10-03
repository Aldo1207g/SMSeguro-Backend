import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

// cat_resolucion: 1 = Aprobado, 2 = Rechazado
const RESOLUCION_APROBADO = 1;

export interface IndicadorListaNegraRow extends RowDataPacket {
  tipo_dato: string;
  valor_dato: string;
  reportes_aprobados: number;
  ultima_confirmacion: string;
}

@Injectable()
export class IndicadoresRepository {
  constructor(private readonly db: DatabaseService) {}

  // Indicadores (teléfonos, URLs) que aparecen en al menos un reporte con
  // dictamen "Aprobado". Ruta: indicador -> detalle_reporte -> reporte -> dictamen.
  // Se agrupa por indicador porque el mismo número/URL puede venir en varios
  // reportes: así sale una sola vez, con cuántos reportes lo confirman.
  async listaNegra(): Promise<IndicadorListaNegraRow[]> {
    const sql = `
      SELECT t.nombre_tipo AS tipo_dato,
             i.valor_dato,
             COUNT(DISTINCT r.id_reporte) AS reportes_aprobados,
             DATE_FORMAT(MAX(d.fecha_evaluacion), '%Y-%m-%d %H:%i:%s') AS ultima_confirmacion
      FROM indicador i
      INNER JOIN cat_tipo_dato t   ON t.id_tipo_dato = i.id_tipo_dato
      INNER JOIN detalle_reporte dr ON dr.id_indicador = i.id_indicador
      INNER JOIN reporte r         ON r.id_reporte = dr.id_reporte
      INNER JOIN dictamen d        ON d.id_reporte = r.id_reporte
      WHERE d.id_resolucion = ?
        AND i.activo = TRUE
        AND r.activo = TRUE
      GROUP BY i.id_indicador, t.nombre_tipo, i.valor_dato
      ORDER BY t.nombre_tipo, i.valor_dato
    `;

    return (await this.db.query(sql, [
      RESOLUCION_APROBADO,
    ])) as IndicadorListaNegraRow[];
  }
}
