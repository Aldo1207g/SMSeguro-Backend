import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reportes')
@UseGuards(AuthGuard)
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