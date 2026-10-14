import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';

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

  @Post()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Agregar una categoria (solo analista/admin)' })
  crear(@Body() dto: CrearCategoriaDto) {
    return this.categoriasService.crear(dto.nombre_tipo);
  }
}
