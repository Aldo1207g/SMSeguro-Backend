import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';

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

  // El id del usuario sale del token (user.sub), así nadie puede ver el conteo de otro
  @Get('mis-estadisticas')
  misEstadisticas(@CurrentUser() user: JwtPayload) {
    return this.reportesService.misEstadisticas(user.sub);
  }
}
