import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsejosService } from './consejos.service';
import { CrearConsejoDto } from './dto/crear-consejo.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';

@ApiTags('Consejos')
@ApiBearerAuth()
@Controller('consejos')
@UseGuards(AuthGuard)
export class ConsejosController {
  constructor(private readonly consejosService: ConsejosService) {}

  // Cualquier usuario logueado (incluido el ciudadano) puede ver los consejos
  @Get()
  @ApiOperation({ summary: 'Lista de consejos y guías para la app' })
  listar() {
    return this.consejosService.listar();
  }

  // Solo analista o administrador puede publicar
  @Post()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Publicar un consejo (solo analista/admin)' })
  crear(@Body() dto: CrearConsejoDto, @CurrentUser() user: JwtPayload) {
    // El autor sale del token, nunca del body
    return this.consejosService.crear(user.sub, dto);
  }
}
