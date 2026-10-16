import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { sign, verify } from './jwt';
import { RefreshDto } from './dto/refresh.dto';

const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60;
const TAM_MAXIMO_PERFIL = 5 * 1024 * 1024;
// Recuperación de contraseña: el código dura 15 min y permite 5 intentos
const MINUTOS_CODIGO = 15;
const MAX_INTENTOS_CODIGO = 5;
const MENSAJE_RECUPERACION =
  'Si el correo está registrado, te enviamos un código de 6 dígitos para restablecer tu contraseña.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly db: DatabaseService) {}

  async registrar(dto: RegisterDto) {
    const usuarioExistente = await this.db.query(
      'SELECT id_usuario FROM usuario WHERE correo_electronico = ?',
      [dto.correo_electronico],
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
      VALUES (?, ?, ?, 1)
    `;

    try {
      const resultado: any = await this.db.query(sql, [
        dto.nombre_usuario,
        dto.correo_electronico,
        contrasenaHash,
      ]);

      return {
        mensaje: 'Usuario registrado exitosamente',
        id_usuario: resultado.insertId,
        nombre_usuario: dto.nombre_usuario,
        correo_electronico: dto.correo_electronico,
        rol: 'Ciudadano',
      };
    } catch {
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
      WHERE u.correo_electronico = ?
    `;

    const usuarios: any = await this.db.query(sql, [dto.correo_electronico]);

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

    const accessToken = sign({ ...claims, type: 'access' }, ACCESS_TTL);
    const refreshToken = sign({ ...claims, type: 'refresh' }, REFRESH_TTL);

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

  // Paso 1: hacemos un código de 6 dígitos y lo guardamos hasheado.
  // Siempre contestamos lo mismo aunque el correo no exista, así nadie
  // puede adivinar qué correos ya están registrados.
  async solicitarRecuperacion(dto: ForgotPasswordDto) {
    const usuarios = (await this.db.query(
      'SELECT id_usuario FROM usuario WHERE correo_electronico = ? AND activo = TRUE LIMIT 1',
      [dto.correo_electronico],
    )) as { id_usuario: number }[];

    if (usuarios.length > 0) {
      const idUsuario = usuarios[0].id_usuario;
      const codigo = randomInt(100000, 1000000).toString();
      const codigoHash = await bcrypt.hash(codigo, 10);

      // Invalida códigos anteriores y guarda el nuevo
      await this.db.query(
        'UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_usuario = ? AND usado = FALSE',
        [idUsuario],
      );
      await this.db.query(
        `INSERT INTO recuperacion_contrasena (id_usuario, codigo_hash, expira)
         VALUES (?, ?, NOW() + INTERVAL ${MINUTOS_CODIGO} MINUTE)`,
        [idUsuario, codigoHash],
      );

      // Aún no hay servicio de correo: en desarrollo el código se ve en la
      // terminal del backend. En producción aquí se enviaría por email.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[DEV] Código de recuperación para ${dto.correo_electronico}: ${codigo}`,
        );
      }
    }

    return { mensaje: MENSAJE_RECUPERACION };
  }

  // Paso 2: revisamos el código (que siga vigente, sin usar y con máx. 5 intentos) y cambiamos la contraseña
  async restablecerContrasena(dto: ResetPasswordDto) {
    const errorCodigo = new BadRequestException(
      'El código es incorrecto o ya venció. Solicita uno nuevo.',
    );

    const filas = (await this.db.query(
      `SELECT rc.id_recuperacion, rc.id_usuario, rc.codigo_hash, rc.intentos
         FROM recuperacion_contrasena rc
         INNER JOIN usuario u ON u.id_usuario = rc.id_usuario
        WHERE u.correo_electronico = ?
          AND rc.usado = FALSE
          AND rc.expira > NOW()
        ORDER BY rc.id_recuperacion DESC
        LIMIT 1`,
      [dto.correo_electronico],
    )) as {
      id_recuperacion: number;
      id_usuario: number;
      codigo_hash: string;
      intentos: number;
    }[];

    if (filas.length === 0 || filas[0].intentos >= MAX_INTENTOS_CODIGO) {
      throw errorCodigo;
    }
    const registro = filas[0];

    const coincide = await bcrypt.compare(dto.codigo, registro.codigo_hash);
    if (!coincide) {
      await this.db.query(
        'UPDATE recuperacion_contrasena SET intentos = intentos + 1 WHERE id_recuperacion = ?',
        [registro.id_recuperacion],
      );
      throw errorCodigo;
    }

    const nuevoHash = await bcrypt.hash(dto.nueva_contrasena, 10);
    await this.db.query(
      'UPDATE usuario SET contrasena_hash = ? WHERE id_usuario = ?',
      [nuevoHash, registro.id_usuario],
    );
    await this.db.query(
      'UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_recuperacion = ?',
      [registro.id_recuperacion],
    );

    return {
      mensaje:
        'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
    };
  }

  async subirFotoPerfil(idUsuario: number, archivo?: any) {
    if (!archivo || !archivo.buffer) {
      throw new BadRequestException('No se envió ninguna imagen');
    }
    if (!String(archivo.mimetype).startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }
    if (archivo.size > TAM_MAXIMO_PERFIL) {
      throw new BadRequestException('La imagen no puede pesar más de 5 MB');
    }

    const carpeta = path.join('uploads', 'perfiles');
    fs.mkdirSync(carpeta, { recursive: true });

    const extension = archivo.mimetype === 'image/png' ? 'png' : 'jpg';
    const hash = createHash('sha256')
      .update(archivo.buffer)
      .digest('hex')
      .slice(0, 16);
    const nombreArchivo = `perfil_${idUsuario}_${hash}.${extension}`;
    const rutaArchivo = path.join(carpeta, nombreArchivo);

    fs.writeFileSync(rutaArchivo, archivo.buffer);

    await this.db.query(
      'UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?',
      [rutaArchivo, idUsuario],
    );

    return {
      mensaje: 'Foto de perfil actualizada exitosamente',
      ruta_archivo: rutaArchivo,
    };
  }

  async obtenerFotoPerfil(idUsuario: number) {
    const filas: any = await this.db.query(
      'SELECT foto_perfil FROM usuario WHERE id_usuario = ?',
      [idUsuario],
    );

    if (!Array.isArray(filas) || filas.length === 0 || !filas[0].foto_perfil) {
      throw new NotFoundException('El usuario no tiene foto de perfil');
    }

    const rutaAbsoluta = path.resolve(filas[0].foto_perfil);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new NotFoundException(
        'No se encontró el archivo de foto de perfil',
      );
    }

    const mimeType = rutaAbsoluta.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { ruta: rutaAbsoluta, mimeType };
  }
}
