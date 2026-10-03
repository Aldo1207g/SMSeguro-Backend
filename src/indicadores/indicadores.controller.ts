import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IndicadoresService } from './indicadores.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Indicadores')
@ApiBearerAuth()
@Controller('indicadores')
@UseGuards(AuthGuard)
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get('exportar')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="lista_negra.csv"')
  @ApiOperation({
    summary: 'Descargar lista negra (CSV)',
    description:
      'Exporta los indicadores (teléfonos y URLs) de reportes con dictamen Aprobado.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Archivo lista_negra.csv',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido' })
  exportar(): Promise<string> {
    return this.indicadoresService.exportarListaNegraCsv();
  }
}
