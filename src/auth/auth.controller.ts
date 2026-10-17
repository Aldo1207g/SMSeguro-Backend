import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { JwtPayload } from './jwt';

@ApiTags('Autenticación y Perfil')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registrar(@Body() dto: RegisterDto) {
    return this.authService.registrar(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con el código recibido' })
  restablecerContrasena(@Body() dto: ResetPasswordDto) {
    return this.authService.restablecerContrasena(dto);
  }

  @Post('foto-perfil')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('foto'))
  @ApiOperation({ summary: 'Subir o actualizar foto de perfil del usuario' })
  subirFotoPerfil(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() foto: any,
  ) {
    return this.authService.subirFotoPerfil(user.sub, foto);
  }

  @Get('foto-perfil')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Obtener foto de perfil del usuario autenticado' })
  async obtenerFotoPerfil(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const archivo = await this.authService.obtenerFotoPerfil(user.sub);
    res.setHeader('Content-Type', archivo.mimeType);
    res.sendFile(archivo.ruta);
  }
}
