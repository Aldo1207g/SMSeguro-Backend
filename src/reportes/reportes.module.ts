import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ReportesRepository } from './reportes.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService, ReportesRepository],
})
export class ReportesModule {}