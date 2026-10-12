import { Module } from '@nestjs/common';
import { ConsejosController } from './consejos.controller';
import { ConsejosService } from './consejos.service';
import { ConsejosRepository } from './consejos.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ConsejosController],
  providers: [ConsejosService, ConsejosRepository],
})
export class ConsejosModule {}
