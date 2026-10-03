import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresRepository } from './indicadores.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresRepository],
})
export class IndicadoresModule {}
