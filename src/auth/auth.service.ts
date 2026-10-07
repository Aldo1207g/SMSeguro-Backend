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
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async registrar(dto: RegisterDto) {
    const usuarioExistente = await this.db.query(
      `SELECT id_usuario FROM usuario WHERE correo_electronico = '${dto.correo_electronico}'`
    );

    if (Array.isArray(usuarioExistente) && usuarioExistente.length > 0) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const contrasenaHash = crypto.createHash('sha256').update(dto.contrasena).digest('hex');

    const sql = `
      INSERT INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario)
      VALUES ('${dto.nombre_usuario}', '${dto.correo_electronico}', '${contrasenaHash}', 1)
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
      SELECT u.id_usuario, u.nombre_usuario, u.correo_electronico, u.contrasena_hash, u.activo, r.nombre_rol
      FROM usuario u
      INNER JOIN cat_rol_usuario r ON u.id_rol_usuario = r.id_rol_usuario
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

    const hashIngresado = crypto.createHash('sha256').update(dto.contrasena).digest('hex');
    const coincide = hashIngresado === usuario.contrasena_hash;

    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      mensaje: 'Inicio de sesión exitoso',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        correo_electronico: usuario.correo_electronico,
        rol: usuario.nombre_rol,
      },
    };
  }

  async restablecerContrasena(dto: ResetPasswordDto) {
    const usuarios: any = await this.db.query(
      `SELECT id_usuario FROM usuario WHERE correo_electronico = '${dto.correo_electronico}'`
    );

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      throw new NotFoundException(
        'No existe una cuenta registrada con ese correo electrónico',
      );
    }

    const nuevoHash = crypto.createHash('sha256').update(dto.nueva_contrasena).digest('hex');

    await this.db.query(
      `UPDATE usuario SET contrasena_hash = '${nuevoHash}' WHERE correo_electronico = '${dto.correo_electronico}'`
    );

    return {
      mensaje:
        'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
    };
  }
}