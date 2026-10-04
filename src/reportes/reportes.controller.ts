import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
import type { ArchivoSubido } from './reportes.service';

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

  // Lista los reportes del usuario logueado (para la pantalla de lista de la app)
  @Get('mis-reportes')
  @ApiOperation({ summary: 'Lista los reportes del usuario logueado' })
  misReportes(@CurrentUser() user: JwtPayload) {
    return this.reportesService.misReportes(user.sub);
  }

  // Bandeja del analista: reportes pendientes (solo Analista / Admin)
  @Get('pendientes')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reportes pendientes de dictaminar (Analista/Admin)' })
  reportesPendientes() {
    return this.reportesService.reportesPendientes();
  }

  // ⚠️ Las rutas con :id van al final para no "tapar" a /prueba, /conteo, etc.

  // Lista reportes por estado (2=Aprobado, 3=Rechazado) para el panel
  @Get('por-estado/:idEstado')
  @UseGuards(RolesGuard)
  reportesPorEstado(@Param('idEstado', ParseIntPipe) idEstado: number) {
    return this.reportesService.reportesPorEstado(idEstado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un reporte' })
  verDetalle(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.verDetalle(idReporte, user);
  }

  // Devuelve la foto de evidencia del reporte como imagen
  @Get(':id/captura')
  @ApiOperation({ summary: 'Ver la foto de evidencia de un reporte' })
  async verCaptura(
    @Param('id', ParseIntPipe) idReporte: number,
    @Res() res: Response,
  ) {
    const captura = await this.reportesService.obtenerCaptura(idReporte);
    res.setHeader('Content-Type', captura.mimeType);
    res.sendFile(captura.ruta);
  }

  // Sube una foto de evidencia para el reporte (campo 'foto' en form-data)
  @Post(':id/captura')
  @UseInterceptors(FileInterceptor('foto'))
  @ApiOperation({ summary: 'Subir foto de evidencia de un reporte' })
  subirCaptura(
    @Param('id', ParseIntPipe) idReporte: number,
    @UploadedFile() foto: ArchivoSubido,
  ) {
    return this.reportesService.subirCaptura(idReporte, foto);
  }

  @Patch(':id')
  editarInseguro(
    @Param('id', ParseIntPipe) idReporte: number,
    @Body() dto: any,
  ) {
    return this.reportesService.editar(idReporte, dto, dto.id_usuario);
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
