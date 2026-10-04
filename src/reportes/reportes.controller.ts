import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';
import { CrearReporteDto } from './dto/crear-reporte.dto';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(AuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('prueba')
  prueba() {
    return this.reportesService.prueba();
  }

  @Get('conteo')
  contarReportes() {
    return this.reportesService.contarReportes();
  }

  // El id del usuario sale del token (user.sub), así nadie puede ver el conteo de otro
  @Get('mis-estadisticas')
  misEstadisticas(@CurrentUser() user: JwtPayload) {
    return this.reportesService.misEstadisticas(user.sub);
  }

  // Bandeja del analista: reportes pendientes de dictaminar (solo Analista / Admin)
  @Get('pendientes')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Reportes pendientes de dictaminar (Analista/Admin)',
  })
  reportesPendientes() {
    return this.reportesService.reportesPendientes();
  }

  // Lista los reportes del usuario logueado (para la pantalla de lista de la app)
  @Get('mis-reportes')
  @ApiOperation({ summary: 'Lista los reportes del usuario logueado' })
  misReportes(@CurrentUser() user: JwtPayload) {
    return this.reportesService.misReportes(user.sub);
  }

  // Herramienta interna: solo Analista y Administrador (Ciudadano -> 403)
  @Get('estadisticas/dashboard')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Dashboard: reportes por categoría y por estado (Analista/Admin)',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no tiene acceso' })
  dashboard() {
    return this.reportesService.dashboard();
  }

  // El autor sale del token, nunca del body
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo reporte' })
  crear(@Body() dto: CrearReporteDto, @CurrentUser() user: JwtPayload) {
    return this.reportesService.crear(dto, user.sub);
  }

  // ⚠️ Las rutas con :id van al final para no "tapar" a /prueba, /conteo, etc.

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un reporte' })
  verDetalle(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.verDetalle(idReporte, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar URL, descripción o categoría de un reporte',
  })
  editar(
    @Param('id', ParseIntPipe) idReporte: number,
    @Body() dto: ActualizarReporteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.editar(idReporte, dto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (borrado lógico) un reporte' })
  eliminar(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.eliminar(idReporte, user.sub);
  }
}
