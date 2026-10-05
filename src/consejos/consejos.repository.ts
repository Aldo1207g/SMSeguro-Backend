import { Injectable } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface ConsejoRow extends RowDataPacket {
  id_consejo: number;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
}

@Injectable()
export class ConsejosRepository {
  constructor(private readonly db: DatabaseService) {}

  // Lista los consejos activos, los mas nuevos primero
  async listar(): Promise<ConsejoRow[]> {
    const sql = `
      SELECT id_consejo, titulo, contenido,
             DATE_FORMAT(fecha_creacion, '%Y-%m-%d') AS fecha_creacion
      FROM consejo
      WHERE activo = TRUE
      ORDER BY fecha_creacion DESC, id_consejo DESC
    `;
    return (await this.db.query(sql)) as ConsejoRow[];
  }

  // Guarda un consejo nuevo y regresa su id
  async crear(
    idAnalista: number,
    titulo: string,
    contenido: string,
  ): Promise<number> {
    const resultado = (await this.db.query(
      'INSERT INTO consejo (id_analista, titulo, contenido) VALUES (?, ?, ?)',
      [idAnalista, titulo, contenido],
    )) as ResultSetHeader;
    return resultado.insertId;
  }
}
