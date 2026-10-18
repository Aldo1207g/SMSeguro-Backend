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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportesService, TAM_MAXIMO } from './reportes.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import { CrearComentarioDto } from './dto/crear-comentario.dto';
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
  @ApiOperation({
    summary: 'Reportes pendientes de dictaminar (Analista/Admin)',
  })
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

  // Muro global de la app iOS: reportes activos de los últimos 14 días.
  // Va antes de ':id' para que 'comunidad' no se interprete como un id.
  @Get('comunidad')
  @ApiOperation({
    summary: 'Muro global: reportes activos de los últimos 14 días',
  })
  comunidadGlobal(@CurrentUser() user: JwtPayload) {
    return this.reportesService.comunidadGlobal(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un reporte' })
  verDetalle(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.verDetalle(idReporte, user);
  }

    // Resumen de comunidad: autor y contador de "Mismo caso".
  @Get(':id/comunidad')
  @ApiOperation({ summary: 'Consultar el resumen de comunidad de un reporte' })
  verComunidad(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.verComunidad(idReporte, user);
  }

  // Cada usuario puede marcar el mismo reporte una sola vez.
  // La identidad del usuario sale del token.
  @Post(':id/mismo-caso')
  @ApiOperation({ summary: 'Indicar que me pasó el mismo caso' })
  marcarMismoCaso(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.marcarMismoCaso(idReporte, user);
  }

  // Consulta los comentarios visibles del reporte.
  @Get(':id/comentarios')
  @ApiOperation({ summary: 'Consultar los comentarios de un reporte' })
  comentarios(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.comentarios(idReporte, user);
  }

  // El DTO recibe únicamente el contenido; el autor sale del token.
  @Post(':id/comentarios')
  @ApiOperation({ summary: 'Publicar un comentario en un reporte' })
  comentar(
    @Param('id', ParseIntPipe) idReporte: number,
    @Body() dto: CrearComentarioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportesService.comentar(idReporte, dto, user);
  }

  // Devuelve la foto de evidencia del reporte como imagen
  @Get(':id/captura')
  @ApiOperation({ summary: 'Ver la foto de evidencia de un reporte' })
  async verCaptura(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const captura = await this.reportesService.obtenerCaptura(idReporte, user);
    res.setHeader('Content-Type', captura.mimeType);
    res.sendFile(captura.ruta);
  }

  // Sube la foto de evidencia del reporte (multipart/form-data).
  // La app de iOS la manda en el campo 'file' y otros clientes en 'captura',
  // por eso se acepta cualquier nombre y se toma el primer (y único) archivo.
  // Se queda en memoria: el servicio calcula el hash y la guarda en ./uploads
  @Post(':id/captura')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: TAM_MAXIMO, files: 1 },
    }),
  )
  @ApiOperation({ summary: 'Subir foto de evidencia de un reporte' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  subirCaptura(
    @Param('id', ParseIntPipe) idReporte: number,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() archivos: ArchivoSubido[],
  ) {
    return this.reportesService.subirCaptura(
      idReporte,
      user.sub,
      archivos?.[0],
    );
  }

  @Patch(':id')
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
