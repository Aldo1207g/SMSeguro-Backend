import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { sign, verify } from './jwt';
import { RefreshDto } from './dto/refresh.dto';

const ACCESS_TTL = 15 * 60; // 15 minutos
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 días

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async registrar(dto: RegisterDto) {
    const usuarioExistente = await this.db.query(
      `SELECT id_usuario FROM usuario WHERE correo_electronico = '${dto.correo_electronico}'`,
    );

    if (Array.isArray(usuarioExistente) && usuarioExistente.length > 0) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const contrasenaHash = await bcrypt.hash(dto.contrasena, 10);

    const sql = `
      INSERT INTO usuario (
        nombre_usuario,
        correo_electronico,
        contrasena_hash,
        id_rol_usuario
      )
      VALUES (
        '${dto.nombre_usuario}',
        '${dto.correo_electronico}',
        '${contrasenaHash}',
        1
      )
    `;

    try {
      const resultado: any = await this.db.query(sql);

      return {
        mensaje: 'Usuario registrado exitosamente',
        id_usuario: resultado.insertId,
        nombre_usuario: dto.nombre_usuario,
        correo_electronico: dto.correo_electronico,
        rol: 'Ciudadano',
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  async login(dto: LoginDto) {
    const sql = `
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.correo_electronico,
        u.contrasena_hash,
        u.activo,
        r.nombre_rol
      FROM usuario u
      INNER JOIN cat_rol_usuario r
        ON u.id_rol_usuario = r.id_rol_usuario
      WHERE u.correo_electronico = '${dto.correo_electronico}'
    `;

    const usuarios: any = await this.db.query(sql);

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const usuario = usuarios[0];

    if (!usuario.activo) {
      throw new UnauthorizedException('Tu cuenta se encuentra inactiva');
    }

    const coincide = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasena_hash,
    );

    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const claims = {
      sub: usuario.id_usuario,
      email: usuario.correo_electronico,
      rol: usuario.nombre_rol,
    };

    const accessToken = sign(
      { ...claims, type: 'access' },
      ACCESS_TTL,
    );

    const refreshToken = sign(
      { ...claims, type: 'refresh' },
      REFRESH_TTL,
    );

    return {
      mensaje: 'Inicio de sesión exitoso',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        correo_electronico: usuario.correo_electronico,
        rol: usuario.nombre_rol,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: RefreshDto) {
    const payload = verify(dto.refreshToken);

    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const accessToken = sign(
      {
        sub: payload.sub,
        email: payload.email,
        rol: payload.rol,
        type: 'access',
      },
      ACCESS_TTL,
    );

    return {
      accessToken,
    };
  }

  async restablecerContrasena(dto: ResetPasswordDto) {
    const usuarios: any = await this.db.query(
      `SELECT id_usuario FROM usuario WHERE correo_electronico = '${dto.correo_electronico}'`,
    );

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      throw new NotFoundException(
        'No existe una cuenta registrada con ese correo electrónico',
      );
    }

    const nuevoHash = await bcrypt.hash(dto.nueva_contrasena, 10);

    await this.db.query(
      `UPDATE usuario SET contrasena_hash = '${nuevoHash}' WHERE correo_electronico = '${dto.correo_electronico}'`,
    );

    return {
      mensaje:
        'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
    };
  }
}