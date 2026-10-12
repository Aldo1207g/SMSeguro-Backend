import { Module } from '@nestjs/common';
import { EstadisticasController } from './estadisticas.controller';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasRepository } from './estadisticas.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EstadisticasController],
  providers: [EstadisticasService, EstadisticasRepository],
})
export class EstadisticasModule {}
