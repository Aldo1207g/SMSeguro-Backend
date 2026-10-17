import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mysql.Pool;

  onModuleInit() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? 'root',
      database: process.env.DB_NAME ?? 'smseguro',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const self = this;
    this.pool
      .getConnection()
      .then(async function (conn) {
        self.logger.log('Conexión exitosa a la base de datos MySQL (smseguro)');

        await conn.query(`
          CREATE TABLE IF NOT EXISTS consejo (
            id_consejo INT AUTO_INCREMENT PRIMARY KEY,
            id_analista INT NOT NULL,
            titulo VARCHAR(150) NOT NULL,
            contenido TEXT NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_analista) REFERENCES usuario(id_usuario)
          )
        `);

        try {
          await conn.query(
            'ALTER TABLE usuario ADD COLUMN foto_perfil VARCHAR(255) NULL',
          );
        } catch {
          // La columna foto_perfil ya existe
        }

        await conn.query(`
          CREATE TABLE IF NOT EXISTS reporte_mismo_caso (
            id_reporte INT NOT NULL,
            id_usuario INT NOT NULL,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id_reporte, id_usuario),
            FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
          )
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS comentario_reporte (
            id_comentario INT AUTO_INCREMENT PRIMARY KEY,
            id_reporte INT NOT NULL,
            id_usuario INT NOT NULL,
            contenido VARCHAR(1000) NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
          )
        `);

        // Homologa el límite con el DTO de comentarios.
        await conn.query(`
          ALTER TABLE comentario_reporte
          MODIFY COLUMN contenido VARCHAR(1000) NOT NULL
        `);

        await self.sembrarDatosIniciales(conn);
        conn.release();
      })
      .catch(function (err) {
        self.logger.error('Error al conectar a MySQL:', err.message);
      });
  }

  private async sembrarDatosIniciales(conn: mysql.PoolConnection) {
    try {
      await conn.query(`
        INSERT IGNORE INTO cat_tipo_fraude (nombre_tipo) VALUES
          ('Banca y Finanzas'),
          ('Paqueteria y Aduanas'),
          ('Premios y Sorteos'),
          ('Multas y Gobierno'),
          ('Robo de Cuenta / OTP'),
          ('Empleos y Ofertas Falsas')
      `);

      await conn.query(`
        INSERT IGNORE INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario, activo)
        VALUES
          ('Ciudadano Demo', 'ciudadano.demo@smseguro.com', '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu', 1, 1),
          ('Analista Demo', 'analista.demo@smseguro.com', '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu', 2, 1)
      `);

      const [usuarios]: any = await conn.query(
        'SELECT id_usuario, id_rol_usuario FROM usuario ORDER BY id_usuario ASC',
      );
      if (!Array.isArray(usuarios) || usuarios.length === 0) return;

      const idCiudadano = usuarios[0].id_usuario;
      const analistaEncontrado = usuarios.find(function (u: any) {
        return u.id_rol_usuario === 2 || u.id_rol_usuario === 3;
      });
      const idAnalista = analistaEncontrado ? analistaEncontrado.id_usuario : idCiudadano;

      const [categorias]: any = await conn.query(
        'SELECT id_tipo_fraude, nombre_tipo FROM cat_tipo_fraude',
      );
      const mapaCat: Record<string, number> = {};
      for (const c of categorias) {
        mapaCat[c.nombre_tipo] = c.id_tipo_fraude;
      }

      const b = mapaCat['Banca y Finanzas'] ?? 1;
      const p = mapaCat['Paqueteria y Aduanas'] ?? 1;
      const o = mapaCat['Robo de Cuenta / OTP'] ?? 1;
      const m = mapaCat['Multas y Gobierno'] ?? 1;
      const pr = mapaCat['Premios y Sorteos'] ?? 1;
      const e = mapaCat['Empleos y Ofertas Falsas'] ?? 1;

      await conn.query(
        `INSERT IGNORE INTO reporte (folio_publico, id_usuario, id_estado_actual, id_tipo_fraude, descripcion, fecha_recepcion, activo) VALUES
          ('SMS-SEED0001', ?, 2, ?, 'SMS urgente indicando bloqueo de tarjeta con liga para ingresar NIP.', NOW(), 1),
          ('SMS-SEED0002', ?, 2, ?, 'Aviso falso de cargo no reconocido por $4,850 MXN con portal clonado.', NOW(), 1),
          ('SMS-SEED0003', ?, 2, ?, 'Mensaje sobre actualizacion obligatoria de token movil bancario.', NOW(), 1),
          ('SMS-SEED0004', ?, 1, ?, 'Notificacion de supuesto seguro bancario activado sin autorizacion.', NOW(), 1),
          ('SMS-SEED0005', ?, 3, ?, 'Recordatorio legitimo de fecha de corte sin enlaces maliciosos.', NOW(), 1),
          ('SMS-SEED0006', ?, 2, ?, 'Paquete detenido en aduana por direccion incompleta; pide pago de $49 MXN.', NOW(), 1),
          ('SMS-SEED0007', ?, 2, ?, 'Segundo intento de entrega fallido con enlace acortado para reprogramar.', NOW(), 1),
          ('SMS-SEED0008', ?, 1, ?, 'SMS con numero de guia inexistente solicitando confirmar tarjeta.', NOW(), 1),
          ('SMS-SEED0009', ?, 2, ?, 'Solicitud de codigo de 6 digitos de WhatsApp fingiendo ser soporte.', NOW(), 1),
          ('SMS-SEED0010', ?, 2, ?, 'Supuesta fotomulta de transito con descuento del 50% en liga externa.', NOW(), 1),
          ('SMS-SEED0011', ?, 2, ?, 'Notificacion de sorteo ganado con enlace para reclamar premio.', NOW(), 1),
          ('SMS-SEED0012', ?, 1, ?, 'Oferta de trabajo remoto con sueldo diario alto pidiendo deposito previo.', NOW(), 1)`,
        [
          idCiudadano, b,
          idCiudadano, b,
          idCiudadano, b,
          idCiudadano, b,
          idCiudadano, b,
          idCiudadano, p,
          idCiudadano, p,
          idCiudadano, p,
          idCiudadano, o,
          idCiudadano, m,
          idCiudadano, pr,
          idCiudadano, e,
        ],
      );

      await conn.query(`
        INSERT IGNORE INTO indicador (id_tipo_dato, valor_dato, activo) VALUES
          (2, 'https://acceso-seguro-banca-mx.com/login', 1),
          (2, 'https://rastreo-aduana-envios.net/pago', 1),
          (2, 'https://fotomultas-cdmx-pago.com/liquidar', 1),
          (1, '+52 55 8910 2345', 1),
          (1, '+52 55 4432 1987', 1)
      `);

      await conn.query(`
        INSERT IGNORE INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador)
        SELECT r.id_reporte, i.id_indicador, 2
        FROM reporte r
        JOIN indicador i ON i.valor_dato = 'https://acceso-seguro-banca-mx.com/login'
        WHERE r.folio_publico IN ('SMS-SEED0001', 'SMS-SEED0002', 'SMS-SEED0003')
      `);

      await conn.query(
        `INSERT IGNORE INTO dictamen (id_reporte, id_analista, id_resolucion, motivo_rechazo, fecha_evaluacion)
         SELECT id_reporte, ?, 1, NULL, NOW()
         FROM reporte
         WHERE folio_publico LIKE 'SMS-SEED%' AND id_estado_actual = 2`,
        [idAnalista],
      );

      const [consejosExistentes]: any = await conn.query(
        'SELECT COUNT(*) AS total FROM consejo',
      );
      if (Number(consejosExistentes[0]?.total ?? 0) === 0) {
        await conn.query(
          `INSERT INTO consejo (id_analista, titulo, contenido, activo) VALUES
            (?, '1. Como detectar Smishing Bancario', 'Ningun banco solicita tu NIP, CVV o contrasena mediante enlaces en SMS. Si recibes una alerta de cuenta bloqueada, abre directamente la app oficial de tu banco.', 1),
            (?, '2. Estafas de Paqueteria y Aduanas', 'Los mensajes que exigen pagar cuotas pequeñas para liberar un paquete en aduana son fraudulentos. Verifica siempre el rastreo en el sitio oficial.', 1),
            (?, '3. Protege tus codigos de verificacion (OTP)', 'Los codigos de 6 digitos que llegan por SMS son llaves unicas de acceso. Nunca los compartas por mensaje ni llamada.', 1),
            (?, '4. Como revisar una URL antes de abrirla', 'Observa el dominio principal antes de la primera diagonal. Desconfia de acortadores y verificalo primero en el buscador de SMSeguro.', 1),
            (?, '5. Falsas multas y adeudos de gobierno', 'Desconfia de SMS que prometan descuentos urgentes en multas a traves de dominios .com o .net. Los portales oficiales en Mexico usan .gob.mx.', 1)`,
          [idAnalista, idAnalista, idAnalista, idAnalista, idAnalista],
        );
      }
    } catch (err: any) {
      this.logger.warn('Aviso en seed inicial: ' + err.message);
    }
  }

  async query(sql: string, params: any[] = []) {
    const [results] = await this.pool.execute(sql, params);
    return results;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
