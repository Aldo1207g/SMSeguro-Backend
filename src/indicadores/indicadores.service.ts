import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { IndicadoresRepository } from './indicadores.repository';
import { DatabaseService } from '../database/database.service';

const ENCABEZADOS = [
  'tipo_dato',
  'valor_dato',
  'reportes_aprobados',
  'ultima_confirmacion',
];

// BOM UTF-8: hace que Excel muestre bien acentos y la "ñ"
const BOM = '﻿';

// Si una celda empieza con alguno de estos caracteres, Excel/LibreOffice la
// toman como fórmula (Inyección de Fórmulas CSV, CWE-1236)
const INICIOS_PELIGROSOS = ['=', '+', '-', '@', '\t', '\r'];

// cat_estado_reporte: 2 = Aprobado
const ESTADO_APROBADO = 2;

export interface IndicadorAprobadoRow extends RowDataPacket {
  id_indicador: number;
  valor_dato: string;
  tipo_dato: string;
  folio_publico: string;
  fecha_registro: Date | string | null;
}

@Injectable()
export class IndicadoresService {
  constructor(
    private readonly indicadoresRepository: IndicadoresRepository,
    private readonly db: DatabaseService,
  ) {}

  // CSV de la lista negra (Analista/Admin). Cada celda pasa por escaparCampoCsv
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

  // Prepara un valor para una celda del CSV sin que Excel lo ejecute
  escaparCampoCsv(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    let texto = String(valor);

    // 1. Neutralizar fórmulas: con la comilla simple al inicio Excel lo trata
    // como texto, ej. =HYPERLINK(...) -> '=HYPERLINK(...)
    if (INICIOS_PELIGROSOS.some((caracter) => texto.startsWith(caracter))) {
      texto = "'" + texto;
    }

    // 2. Comas, saltos de línea o comillas: el campo va entre comillas y las
    // comillas internas se duplican
    if (/[",\r\n]/.test(texto)) {
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

  // Indicadores de reportes aprobados. Consulta fija: el estado va como
  // parámetro (?) y no se arma el SQL con datos externos (CWE-89)
  async obtenerListaNegra(): Promise<IndicadorAprobadoRow[]> {
    const sql = `
      SELECT DISTINCT i.id_indicador, i.valor_dato, td.nombre_tipo AS tipo_dato,
             r.folio_publico, r.fecha_registro
      FROM indicador i
      INNER JOIN cat_tipo_dato td   ON i.id_tipo_dato = td.id_tipo_dato
      INNER JOIN detalle_reporte dr ON i.id_indicador = dr.id_indicador
      INNER JOIN reporte r          ON dr.id_reporte = r.id_reporte
      WHERE r.id_estado_actual = ?
      ORDER BY r.fecha_registro DESC
    `;

    try {
      return (await this.db.query(sql, [
        ESTADO_APROBADO,
      ])) as IndicadorAprobadoRow[];
    } catch {
      throw new InternalServerErrorException('Error al obtener la lista negra');
    }
  }

  // CSV de /indicadores/exportar. Cada celda pasa por escaparCampoCsv para
  // que una URL como =cmd|'/c calc'!A1 no se ejecute al abrirlo en Excel
  async exportarCsv(): Promise<string> {
    const cabeceras =
      'id_indicador,valor_dato,tipo_dato,folio_publico,fecha_registro\n';

    try {
      const datos = await this.obtenerListaNegra();

      const filas = datos.map((d) =>
        [
          d.id_indicador,
          d.valor_dato,
          d.tipo_dato,
          d.folio_publico,
          d.fecha_registro instanceof Date
            ? d.fecha_registro.toISOString()
            : d.fecha_registro,
        ]
          .map((valor) => this.escaparCampoCsv(valor))
          .join(','),
      );

      return cabeceras + filas.join('\n');
    } catch {
      throw new InternalServerErrorException('Error al generar el archivo CSV');
    }
  }
}
