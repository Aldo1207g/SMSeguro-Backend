import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class IndicadoresService {
  constructor(private readonly db: DatabaseService) {}

  async obtenerListaNegra() {
    try {
      // Solo devuelve los indicadores de reportes con id_estado_actual = 2 (Aprobado)
      const sql = `
        SELECT DISTINCT i.id_indicador, i.valor_dato, td.nombre_tipo as tipo_dato, r.folio_publico, r.fecha_registro
        FROM indicador i
        INNER JOIN cat_tipo_dato td ON i.id_tipo_dato = td.id_tipo_dato
        INNER JOIN detalle_reporte dr ON i.id_indicador = dr.id_indicador
        INNER JOIN reporte r ON dr.id_reporte = r.id_reporte
        WHERE r.id_estado_actual = 2
        ORDER BY r.fecha_registro DESC
      `;
      return await this.db.query(sql);
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener la lista negra');
    }
  }

  async exportarCsv() {
    try {
      const datos: any = await this.obtenerListaNegra();
      const cabeceras = 'id_indicador,valor_dato,tipo_dato,folio_publico,fecha_registro\n';
      
      if (!Array.isArray(datos) || datos.length === 0) return cabeceras;
      
      const filas = datos.map(d => 
        `${d.id_indicador},"${d.valor_dato}","${d.tipo_dato}","${d.folio_publico}","${d.fecha_registro}"`
      ).join('\n');
      
      return cabeceras + filas;
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo CSV');
    }
  }
}
