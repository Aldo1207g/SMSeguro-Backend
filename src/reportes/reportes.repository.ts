import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

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
}
