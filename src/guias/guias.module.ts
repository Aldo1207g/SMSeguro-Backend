import { Module } from '@nestjs/common';
import { GuiasController } from './guias.controller';

@Module({
  controllers: [GuiasController],
})
export class GuiasModule {}
