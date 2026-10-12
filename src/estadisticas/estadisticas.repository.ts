import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface ConteoCategoriaRow extends RowDataPacket {
  id_tipo_fraude: number | null;
  categoria: string;
  total: number;
}

export interface ConteoEstadoRow extends RowDataPacket {
  id_estado_reporte: number;
  estado: string;
  total: number;
}

@Injectable()
export class EstadisticasRepository {
  constructor(private readonly db: DatabaseService) {}

  // Reportes activos agrupados por tipo de fraude.
  // Se parte del catálogo con LEFT JOIN para que las categorías sin reportes
  // aparezcan con total 0. Como reporte.id_tipo_fraude acepta NULL, los
  // reportes sin categoría se suman aparte como "Sin clasificar".
  async contarPorCategoria(): Promise<ConteoCategoriaRow[]> {
    const sql = `
      SELECT t.id_tipo_fraude, t.nombre_tipo AS categoria, COUNT(r.id_reporte) AS total
      FROM cat_tipo_fraude t
      LEFT JOIN reporte r
        ON r.id_tipo_fraude = t.id_tipo_fraude AND r.activo = TRUE
      GROUP BY t.id_tipo_fraude, t.nombre_tipo

      UNION ALL

      SELECT NULL, 'Sin clasificar', COUNT(*)
      FROM reporte
      WHERE id_tipo_fraude IS NULL AND activo = TRUE
      HAVING COUNT(*) > 0

      ORDER BY total DESC, categoria
    `;

    return (await this.db.query(sql)) as ConteoCategoriaRow[];
  }

  // Reportes activos agrupados por estado actual (Pendiente, Aprobado, Rechazado).
  async contarPorEstado(): Promise<ConteoEstadoRow[]> {
    const sql = `
      SELECT e.id_estado_reporte, e.nombre_estado AS estado, COUNT(r.id_reporte) AS total
      FROM cat_estado_reporte e
      LEFT JOIN reporte r
        ON r.id_estado_actual = e.id_estado_reporte AND r.activo = TRUE
      GROUP BY e.id_estado_reporte, e.nombre_estado
      ORDER BY e.id_estado_reporte
    `;

    return (await this.db.query(sql)) as ConteoEstadoRow[];
  }
}
