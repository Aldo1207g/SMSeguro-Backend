import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { CategoriasRepository } from './categorias.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CategoriasController],
  providers: [CategoriasService, CategoriasRepository],
})
export class CategoriasModule {}
