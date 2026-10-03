import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categorias')
@UseGuards(AuthGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista de categorías (tipos de fraude) para el formulario',
  })
  listar() {
    return this.categoriasService.listar();
  }
}
