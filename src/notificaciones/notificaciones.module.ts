import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesRepository } from './notificaciones.repository';

@Module({
  imports: [AuthModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesRepository],
  // Lo exportamos para que el módulo de dictamen pueda avisar al autor
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
