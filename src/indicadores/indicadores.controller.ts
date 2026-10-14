import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IndicadoresService } from './indicadores.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Indicadores')
@Controller('indicadores')
export class IndicadoresController {
  constructor(
    private readonly indicadoresService: IndicadoresService,
  ) {}

  @Get('buscar')
  @ApiOperation({
    summary: 'Buscador público: ¿esta URL o número ya fue reportado?',
  })
  buscar(@Query('valor') valor: string) {
    return this.indicadoresService.buscar(valor ?? '');
  }

  @Get('lista-negra')
  @ApiOperation({
    summary: 'Consultar los indicadores de reportes aprobados',
  })
  async obtenerListaNegra() {
    return this.indicadoresService.obtenerListaNegra();
  }

  // Exportación original de main.
  @Get('exportar')
  @ApiProduces('text/csv')
  async exportarIndicadores(@Res() res: Response) {
    const csvData = await this.indicadoresService.exportarCsv();
    res.header('Content-Type', 'text/csv');
    res.attachment('indicadores_compromiso.csv');
    return res.send(csvData);
  }

  // Exportación de la rama de integración, con sus permisos.
  @Get('exportar-lista-negra')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="lista_negra.csv"',
  )
  @ApiOperation({
    summary: 'Descargar lista negra (CSV)',
    description:
      'Exporta los indicadores (teléfonos y URLs) de reportes con dictamen Aprobado.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Archivo lista_negra.csv',
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido',
  })
  exportar(): Promise<string> {
    return this.indicadoresService.exportarListaNegraCsv();
  }
}