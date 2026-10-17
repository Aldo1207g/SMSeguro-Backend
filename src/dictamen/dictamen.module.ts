import { Module } from '@nestjs/common';
import { DictamenController } from './dictamen.controller';
import { DictamenService } from './dictamen.service';
import { DictamenRepository } from './dictamen.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DictamenController],
  providers: [DictamenService, DictamenRepository],
})
export class DictamenModule {}
