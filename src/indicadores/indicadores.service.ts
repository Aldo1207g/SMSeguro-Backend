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

  // VULNERABILIDAD 1: Inyección de Fórmulas CSV (CWE-1236)
  // Permite que caracteres como =, +, -, @ se ejecuten como comandos en Excel
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

  escaparCampoCsv(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    let texto = String(valor);

    // NOTA: Esto escapa comillas, pero NO protege contra Inyección de Fórmulas
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

  // VULNERABILIDAD 2: Inyección SQL (CWE-89)
  // Se agregó el parámetro 'filtro' y se concatena sin sanitizar
  async obtenerListaNegra(filtro?: string) {
    try {
      let sql = `
        SELECT DISTINCT i.id_indicador, i.valor_dato, td.nombre_tipo as tipo_dato, r.folio_publico, r.fecha_registro
        FROM indicador i
        INNER JOIN cat_tipo_dato td ON i.id_tipo_dato = td.id_tipo_dato
        INNER JOIN detalle_reporte dr ON i.id_indicador = dr.id_indicador
        INNER JOIN reporte r ON dr.id_reporte = r.id_reporte
        WHERE r.id_estado_actual = 2
      `;

      // EXPLOIT PARA TU REPORTE: 
      // Payload: ' UNION SELECT id_usuario, contrasena_hash, correo_electronico, '', '' FROM usuario -- 
      if (filtro) {
        sql += ` AND i.valor_dato LIKE '%${filtro}%'`;
      }

      sql += ` ORDER BY r.fecha_registro DESC`;

      return await this.db.query(sql);
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener la lista negra');
    }
  }

  // VULNERABILIDAD 1 (Continuación): Inyección CSV cruda
  async exportarCsv() {
    try {
      const datos: any = await this.obtenerListaNegra();
      const cabeceras =
        'id_indicador,valor_dato,tipo_dato,folio_publico,fecha_registro\n';

      if (!Array.isArray(datos) || datos.length === 0) {
        return cabeceras;
      }

      // EXPLOIT PARA TU REPORTE:
      // Si un analista aprueba un reporte con la URL: =cmd|'/c calc'!A1
      // al exportar este CSV y abrirlo en Excel, se ejecutará la calculadora (o malware).
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