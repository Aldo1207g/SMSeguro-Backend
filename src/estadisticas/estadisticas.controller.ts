import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadisticasService } from './estadisticas.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Estadísticas')
@ApiBearerAuth()
@Controller('estadisticas')
// Solo Analista / Administrador (un ciudadano recibe 403)
@UseGuards(AuthGuard, RolesGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('categorias')
  @ApiOperation({ summary: 'Conteo de reportes por tipo de fraude' })
  porCategoria() {
    return this.estadisticasService.porCategoria();
  }

  @Get('estados')
  @ApiOperation({ summary: 'Conteo de reportes por estado' })
  porEstado() {
    return this.estadisticasService.porEstado();
  }
}
