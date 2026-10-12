import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresRepository } from './indicadores.repository';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresRepository],
})
export class IndicadoresModule {}