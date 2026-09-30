import { Injectable } from '@nestjs/common';
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
}