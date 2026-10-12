import { Injectable } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface DictamenRow extends RowDataPacket {
  id_dictamen: number;
  id_reporte: number;
  id_analista: number;
  id_resolucion: number;
  nombre_resolucion: string;
  motivo_rechazo: string | null;
  fecha_evaluacion: Date;
}

@Injectable()
export class DictamenRepository {
  constructor(private readonly db: DatabaseService) {}

  async existeReporte(idReporte: number): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT id_reporte FROM reporte WHERE id_reporte = ? AND activo = TRUE',
      [idReporte],
    )) as RowDataPacket[];

    return filas.length > 0;
  }

  async existeDictamenDeReporte(idReporte: number): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT id_dictamen FROM dictamen WHERE id_reporte = ?',
      [idReporte],
    )) as RowDataPacket[];

    return filas.length > 0;
  }

  async existeResolucion(idResolucion: number): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT id_resolucion FROM cat_resolucion WHERE id_resolucion = ?',
      [idResolucion],
    )) as RowDataPacket[];

    return filas.length > 0;
  }

  async crear(
    idReporte: number,
    idAnalista: number,
    idResolucion: number,
    motivoRechazo: string | null,
  ): Promise<number> {
    const sql = `
      INSERT INTO dictamen (id_reporte, id_analista, id_resolucion, motivo_rechazo)
      VALUES (?, ?, ?, ?)
    `;

    const resultado = (await this.db.query(sql, [
      idReporte,
      idAnalista,
      idResolucion,
      motivoRechazo,
    ])) as ResultSetHeader;

    return resultado.insertId;
  }

  // Cambia el estado del reporte (1=Pendiente, 2=Aprobado, 3=Rechazado)
  async actualizarEstadoReporte(
    idReporte: number,
    idEstado: number,
  ): Promise<void> {
    await this.db.query(
      'UPDATE reporte SET id_estado_actual = ? WHERE id_reporte = ?',
      [idEstado, idReporte],
    );
  }

  async buscarPorId(idDictamen: number): Promise<DictamenRow | null> {
    const sql = `
      SELECT d.id_dictamen, d.id_reporte, d.id_analista, d.id_resolucion,
             r.nombre_resolucion, d.motivo_rechazo, d.fecha_evaluacion
      FROM dictamen d
      INNER JOIN cat_resolucion r ON d.id_resolucion = r.id_resolucion
      WHERE d.id_dictamen = ?
    `;

    const filas = (await this.db.query(sql, [idDictamen])) as DictamenRow[];

    return filas.length > 0 ? filas[0] : null;
  }
}
