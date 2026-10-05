import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ReportesModule } from './reportes/reportes.module';
import { DictamenModule } from './dictamen/dictamen.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ConsejosModule } from './consejos/consejos.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ReportesModule,
    DictamenModule,
    EstadisticasModule,
    IndicadoresModule,
    CategoriasModule,
    ConsejosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
