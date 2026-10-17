import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';
import { NotificacionesService } from './notificaciones.service';

// Bandeja de avisos del usuario logueado (el usuario siempre sale del token)
@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(AuthGuard)
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Mis notificaciones (últimas 50)' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.sub);
  }

  @Get('no-leidas')
  @ApiOperation({ summary: 'Cuántas notificaciones no he leído' })
  noLeidas(@CurrentUser() user: JwtPayload) {
    return this.service.noLeidas(user.sub);
  }

  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  marcarTodas(@CurrentUser() user: JwtPayload) {
    return this.service.marcarTodas(user.sub);
  }

  @Patch(':id/leida')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarLeida(id, user.sub);
  }
}
