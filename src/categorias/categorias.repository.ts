import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface CategoriaRow extends RowDataPacket {
  id_tipo_fraude: number;
  nombre_tipo: string;
}

@Injectable()
export class CategoriasRepository {
  constructor(private readonly db: DatabaseService) {}

  // Las categorías de fraude viven en el catálogo cat_tipo_fraude
  async listar(): Promise<CategoriaRow[]> {
    const filas = await this.db.query(
      'SELECT id_tipo_fraude, nombre_tipo FROM cat_tipo_fraude ORDER BY id_tipo_fraude',
    );

    return filas as CategoriaRow[];
  }
}
