import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ReportesModule } from './reportes/reportes.module';
import { DictamenModule } from './dictamen/dictamen.module';

@Module({
  imports: [DatabaseModule, AuthModule, ReportesModule, DictamenModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
