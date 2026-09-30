import { Controller, Get } from '@nestjs/common';
import { ReportesService } from './reportes.service';

@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
  ) {}

  @Get('prueba')
  prueba() {
    return this.reportesService.prueba();
  }

  @Get('conteo')
  contarReportes() {
    return this.reportesService.contarReportes();
  }
}