import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DictamenService } from './dictamen.service';
import { CrearDictamenDto } from './dto/crear-dictamen.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt';

@Controller('reportes')
@UseGuards(AuthGuard)
export class DictamenController {
  constructor(private readonly dictamenService: DictamenService) {}

  @Post(':id/dictamen')
  @HttpCode(HttpStatus.CREATED)
  crear(
    @Param('id', ParseIntPipe) idReporte: number,
    @Body() dto: CrearDictamenDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // El id del analista sale del token (user.sub), nunca del body
    return this.dictamenService.crear(idReporte, user.sub, dto);
  }
}
