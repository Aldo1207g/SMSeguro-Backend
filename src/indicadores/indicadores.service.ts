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

  // Convierte un valor a un campo CSV seguro (RFC 4180 + protección de Excel)
  escaparCampoCsv(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    let texto = String(valor);

    // 1. Inyección de fórmulas: los valores vienen de SMS de estafadores.
    //    Si una "URL" empieza con =, +, -, @ Excel podría ejecutarla como
    //    fórmula al abrir el archivo. Se antepone ' para que sea texto.
    //    Excepción: teléfonos como "+52 55 1234 5678" se dejan intactos.
    const esTelefono = /^\+?[\d\s()-]+$/.test(texto);
    if (/^[=+\-@\t\r]/.test(texto) && !esTelefono) {
      texto = `'${texto}`;
    }

    // 2. Si el campo tiene coma, comillas o salto de línea, se encierra
    //    entre comillas dobles y las comillas internas se duplican.
    if (/[",\n\r]/.test(texto)) {
      texto = `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
  }
}
