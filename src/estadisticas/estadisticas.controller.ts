import { Controller, Get } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';

@Controller('reportes/estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('dashboard')
  async obtenerDashboard() {
    return await this.estadisticasService.obtenerMetricasDashboard();
  }
}