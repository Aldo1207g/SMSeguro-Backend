import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { IndicadoresService } from './indicadores.service';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  // Buscador público de amenazas
  @Get('lista-negra')
  async obtenerListaNegra() {
    return this.indicadoresService.obtenerListaNegra();
  }

  // Exportación en CSV
  @Get('exportar')
  async exportarIndicadores(@Res() res: Response) {
    const csvData = await this.indicadoresService.exportarCsv();
    res.header('Content-Type', 'text/csv');
    res.attachment('indicadores_compromiso.csv');
    return res.send(csvData);
  }
}
