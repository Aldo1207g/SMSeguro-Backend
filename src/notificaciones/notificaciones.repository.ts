import { Injectable } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface NotificacionRow extends RowDataPacket {
  id_notificacion: number;
  id_reporte: number | null;
  titulo: string;
  mensaje: string;
  leida: number;
  fecha_creacion: string;
}

@Injectable()
export class NotificacionesRepository {
  constructor(private readonly db: DatabaseService) {}

  async crear(
    idUsuario: number,
    idReporte: number | null,
    titulo: string,
    mensaje: string,
  ): Promise<number> {
    const resultado = (await this.db.query(
      `INSERT INTO notificacion (id_usuario, id_reporte, titulo, mensaje)
       VALUES (?, ?, ?, ?)`,
      [idUsuario, idReporte, titulo, mensaje],
    )) as ResultSetHeader;
    return resultado.insertId;
  }

  // Últimas 50 notificaciones del usuario (las más nuevas primero)
  async listar(idUsuario: number): Promise<NotificacionRow[]> {
    return (await this.db.query(
      `SELECT id_notificacion, id_reporte, titulo, mensaje, leida,
              DATE_FORMAT(fecha_creacion, '%Y-%m-%d %H:%i') AS fecha_creacion
         FROM notificacion
        WHERE id_usuario = ?
        ORDER BY id_notificacion DESC
        LIMIT 50`,
      [idUsuario],
    )) as NotificacionRow[];
  }

  async contarNoLeidas(idUsuario: number): Promise<number> {
    const filas = (await this.db.query(
      'SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leida = FALSE',
      [idUsuario],
    )) as RowDataPacket[];
    return Number(filas[0].total);
  }

  // Solo marca la notificación si pertenece al usuario (evita IDOR)
  async marcarLeida(
    idNotificacion: number,
    idUsuario: number,
  ): Promise<boolean> {
    const resultado = (await this.db.query(
      'UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?',
      [idNotificacion, idUsuario],
    )) as ResultSetHeader;
    return resultado.affectedRows > 0;
  }

  async marcarTodas(idUsuario: number): Promise<void> {
    await this.db.query(
      'UPDATE notificacion SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE',
      [idUsuario],
    );
  }

  // Dueño del reporte, para avisarle cuando cambia de estado
  async autorDeReporte(idReporte: number): Promise<number | null> {
    const filas = (await this.db.query(
      'SELECT id_usuario FROM reporte WHERE id_reporte = ?',
      [idReporte],
    )) as RowDataPacket[];
    return filas.length > 0 ? Number(filas[0].id_usuario) : null;
  }
}
