import { Injectable } from '@nestjs/common';
import { EstadisticasRepository } from './estadisticas.repository';

@Injectable()
export class EstadisticasService {
  constructor(
    private readonly estadisticasRepository: EstadisticasRepository,
  ) {}

  async porCategoria() {
    const filas = await this.estadisticasRepository.contarPorCategoria();

    // COUNT() de MySQL es BIGINT: se fuerza a number para que el JSON
    // llegue listo para las gráficas.
    const datos = filas.map((fila) => ({
      id_tipo_fraude: fila.id_tipo_fraude,
      categoria: fila.categoria,
      total: Number(fila.total),
    }));

    return {
      total_reportes: datos.reduce((suma, d) => suma + d.total, 0),
      datos,
    };
  }

  async porEstado() {
    const filas = await this.estadisticasRepository.contarPorEstado();

    const datos = filas.map((fila) => ({
      id_estado_reporte: fila.id_estado_reporte,
      estado: fila.estado,
      total: Number(fila.total),
    }));

    return {
      total_reportes: datos.reduce((suma, d) => suma + d.total, 0),
      datos,
    };
  }
}
