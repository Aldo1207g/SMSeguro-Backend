import { Injectable } from '@nestjs/common';
import { EstadisticasRepository } from './estadisticas.repository';

@Injectable()
export class EstadisticasService {
  constructor(
    private readonly estadisticasRepository: EstadisticasRepository,
  ) {}

  async porCategoria() {
    const filas = await this.estadisticasRepository.contarPorCategoria();

    const datos: {
      id_tipo_fraude: number | null;
      categoria: string;
      total: number;
    }[] = [];
    let total = 0;
    for (const fila of filas) {
      // COUNT() de MySQL llega como texto/BIGINT, lo pasamos a numero
      const cantidad = Number(fila.total);
      total += cantidad;
      datos.push({
        id_tipo_fraude: fila.id_tipo_fraude,
        categoria: fila.categoria,
        total: cantidad,
      });
    }

    return {
      total_reportes: total,
      datos,
    };
  }

  async porEstado() {
    const filas = await this.estadisticasRepository.contarPorEstado();

    const datos: {
      id_estado_reporte: number;
      estado: string;
      total: number;
    }[] = [];
    let total = 0;
    for (const fila of filas) {
      const cantidad = Number(fila.total);
      total += cantidad;
      datos.push({
        id_estado_reporte: fila.id_estado_reporte,
        estado: fila.estado,
        total: cantidad,
      });
    }

    return {
      total_reportes: total,
      datos,
    };
  }
}
