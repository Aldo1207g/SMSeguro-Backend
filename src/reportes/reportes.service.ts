import { Injectable } from '@nestjs/common';
import { ReportesRepository } from './reportes.repository';

@Injectable()
export class ReportesService {
  constructor(
    private readonly reportesRepository: ReportesRepository,
  ) {}

  prueba() {
    return {
      mensaje: 'Módulo de reportes funcionando',
    };
  }

  async contarReportes() {
    return this.reportesRepository.contarReportes();
  }

  async misEstadisticas(idUsuario: number) {
    const total = await this.reportesRepository.contarPorUsuario(idUsuario);

    return {
      total_reportes: total,
    };
  }
}
