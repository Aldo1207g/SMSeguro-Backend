import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadisticasService } from './estadisticas.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Estadísticas')
@ApiBearerAuth()
@Controller('reportes/estadisticas')
@UseGuards(AuthGuard, RolesGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener métricas completas para el dashboard del analista' })
  async obtenerDashboard() {
    return await this.estadisticasService.obtenerMetricasDashboard();
  }
}