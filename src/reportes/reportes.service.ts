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
}