import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { IndicadoresModule } from './indicadores/indicadores.module'; 
import { GuiasModule } from './guias/guias.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module'; // <-- Añade esta línea

@Module({
  imports: [DatabaseModule, AuthModule, IndicadoresModule, GuiasModule, EstadisticasModule], // <-- Añádelo aquí
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}