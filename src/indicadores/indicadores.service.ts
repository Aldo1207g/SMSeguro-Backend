import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IndicadoresRepository } from './indicadores.repository';
import { DatabaseService } from '../database/database.service';

const ENCABEZADOS = [
  'tipo_dato',
  'valor_dato',
  'reportes_aprobados',
  'ultima_confirmacion',
];

// BOM UTF-8: hace que Excel muestre bien acentos y la "ñ"
const BOM = '\uFEFF';

@Injectable()
export class IndicadoresService {
  constructor(
    private readonly indicadoresRepository: IndicadoresRepository,
    private readonly db: DatabaseService,
  ) {}

  async exportarListaNegraCsv(): Promise<string> {
    const filas = await this.indicadoresRepository.listaNegra();

    const lineas = filas.map((fila) =>
      [
        fila.tipo_dato,
        fila.valor_dato,
        fila.reportes_aprobados,
        fila.ultima_confirmacion,
      ]
        .map((valor) => this.escaparCampoCsv(valor))
        .join(','),
    );

    return BOM + [ENCABEZADOS.join(','), ...lineas].join('\n') + '\n';
  }

  // Prepara un valor para ponerlo en el CSV.
  // Si el valor trae una coma o comillas, lo encerramos entre comillas dobles
  // para que no se rompan las columnas al abrirlo en Excel.
  escaparCampoCsv(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    let texto = String(valor);

    if (texto.includes(',') || texto.includes('"')) {
      texto = '"' + texto.replace(/"/g, '""') + '"';
    }

    return texto;
  }

  // Buscador publico: dice si un valor (URL o numero) ya fue reportado
  async buscar(valor: string) {
    const texto = (valor ?? '').trim();

    if (texto === '') {
      return {
        valor: '',
        encontrado: false,
        total_reportes: 0,
        aprobados: 0,
        rechazados: 0,
      };
    }

    const fila = await this.indicadoresRepository.buscarAmenaza(texto);
    const total = Number(fila.total_reportes) || 0;
    const aprobados = Number(fila.aprobados) || 0;
    const rechazados = Number(fila.rechazados) || 0;

    return {
      valor: texto,
      encontrado: total > 0,
      total_reportes: total,
      aprobados,
      rechazados,
    };
  }

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
      const cabeceras =
        'id_indicador,valor_dato,tipo_dato,folio_publico,fecha_registro\n';

      if (!Array.isArray(datos) || datos.length === 0) {
        return cabeceras;
      }

      const filas = datos
        .map(
          (d) =>
            `${d.id_indicador},"${d.valor_dato}","${d.tipo_dato}","${d.folio_publico}","${d.fecha_registro}"`,
        )
        .join('\n');

      return cabeceras + filas;
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo CSV');
    }
  }
}