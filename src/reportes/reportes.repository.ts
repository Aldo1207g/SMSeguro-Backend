import { Injectable } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

// cat_tipo_dato: 2 = URL | cat_rol_indicador: 2 = Enlace
const TIPO_DATO_URL = 2;
const ROL_INDICADOR_ENLACE = 2;

export interface ReporteDetalleRow extends RowDataPacket {
  id_reporte: number;
  folio_publico: string;
  id_usuario: number;
  descripcion: string;
  url: string | null;
  id_tipo_fraude: number | null;
  nombre_tipo: string | null;
  id_estado_actual: number;
  nombre_estado: string;
  fecha_registro: string;
}

@Injectable()
export class ReportesRepository {
  constructor(private readonly db: DatabaseService) {}

  async contarReportes() {
    const resultado = await this.db.query(
      'SELECT COUNT(*) AS total FROM reporte',
    );

    return resultado;
  }

  // Cuenta los reportes activos que envió un usuario
  async contarPorUsuario(idUsuario: number): Promise<number> {
    const filas = (await this.db.query(
      'SELECT COUNT(*) AS total FROM reporte WHERE id_usuario = ? AND activo = TRUE',
      [idUsuario],
    )) as RowDataPacket[];

    return Number(filas[0].total);
  }

  // Detalle de un reporte activo con su categoría, estado y URL (indicador "Enlace")
  async buscarDetalle(idReporte: number): Promise<ReporteDetalleRow | null> {
    const sql = `
      SELECT r.id_reporte, r.folio_publico, r.id_usuario, r.descripcion,
             (SELECT i.valor_dato
                FROM detalle_reporte dr
                INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
               WHERE dr.id_reporte = r.id_reporte AND dr.id_rol_indicador = ?
               LIMIT 1) AS url,
             r.id_tipo_fraude, t.nombre_tipo,
             r.id_estado_actual, e.nombre_estado,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d %H:%i:%s') AS fecha_registro
      FROM reporte r
      LEFT JOIN cat_tipo_fraude t     ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN cat_estado_reporte e ON e.id_estado_reporte = r.id_estado_actual
      WHERE r.id_reporte = ? AND r.activo = TRUE
    `;

    const filas = (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      idReporte,
    ])) as ReporteDetalleRow[];

    return filas.length > 0 ? filas[0] : null;
  }

  // Inserta el reporte (estado 1 = Pendiente por DEFAULT) y regresa su id
  async crear(
    idUsuario: number,
    folioPublico: string,
    descripcion: string,
    idTipoFraude: number,
  ): Promise<number> {
    const resultado = (await this.db.query(
      `INSERT INTO reporte (folio_publico, id_usuario, id_tipo_fraude, descripcion, fecha_recepcion)
       VALUES (?, ?, ?, ?, NOW())`,
      [folioPublico, idUsuario, idTipoFraude, descripcion],
    )) as ResultSetHeader;

    return resultado.insertId;
  }

  async existeTipoFraude(idTipoFraude: number): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT id_tipo_fraude FROM cat_tipo_fraude WHERE id_tipo_fraude = ?',
      [idTipoFraude],
    )) as RowDataPacket[];

    return filas.length > 0;
  }

  // COALESCE: si el valor llega en null, se conserva el que ya estaba
  async actualizarDatos(
    idReporte: number,
    descripcion: string | null,
    idTipoFraude: number | null,
  ): Promise<void> {
    await this.db.query(
      `UPDATE reporte
          SET descripcion = COALESCE(?, descripcion),
              id_tipo_fraude = COALESCE(?, id_tipo_fraude)
        WHERE id_reporte = ?`,
      [descripcion, idTipoFraude, idReporte],
    );
  }

  // La URL vive en la tabla indicador (valor_dato es UNIQUE y puede compartirse
  // entre reportes), así que NO se edita el indicador viejo: se busca o crea el
  // indicador de la nueva URL y se cambia el enlace en detalle_reporte.
  async reemplazarUrl(idReporte: number, url: string): Promise<void> {
    const existentes = (await this.db.query(
      'SELECT id_indicador FROM indicador WHERE valor_dato = ?',
      [url],
    )) as RowDataPacket[];

    let idIndicador: number;
    if (existentes.length > 0) {
      idIndicador = Number(existentes[0].id_indicador);
    } else {
      const insertado = (await this.db.query(
        'INSERT INTO indicador (id_tipo_dato, valor_dato) VALUES (?, ?)',
        [TIPO_DATO_URL, url],
      )) as ResultSetHeader;
      idIndicador = insertado.insertId;
    }

    await this.db.query(
      'DELETE FROM detalle_reporte WHERE id_reporte = ? AND id_rol_indicador = ?',
      [idReporte, ROL_INDICADOR_ENLACE],
    );

    await this.db.query(
      'INSERT INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador) VALUES (?, ?, ?)',
      [idReporte, idIndicador, ROL_INDICADOR_ENLACE],
    );
  }

  // Borrado lógico: el registro se conserva (dictamen, capturas e historial
  // dependen de él) pero deja de aparecer en la app y en las estadísticas
  async desactivar(idReporte: number): Promise<void> {
    await this.db.query(
      'UPDATE reporte SET activo = FALSE WHERE id_reporte = ?',
      [idReporte],
    );
  }
}
