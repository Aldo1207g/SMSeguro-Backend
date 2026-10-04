import { Injectable } from '@nestjs/common';
import { IndicadoresRepository } from './indicadores.repository';

const ENCABEZADOS = [
  'tipo_dato',
  'valor_dato',
  'reportes_aprobados',
  'ultima_confirmacion',
];

// BOM UTF-8: hace que Excel muestre bien acentos y la "ñ"
const BOM = '﻿';

@Injectable()
export class IndicadoresService {
  constructor(private readonly indicadoresRepository: IndicadoresRepository) {}

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
}
