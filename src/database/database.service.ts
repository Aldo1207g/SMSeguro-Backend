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

    this.pool
      .getConnection()
      .then(async (conn) => {
        this.logger.log('Conexión exitosa a la base de datos MySQL (smseguro)');
        try {
          await this.crearTablasFaltantes(conn);
          await this.sembrarDatosIniciales(conn);
        } finally {
          conn.release();
        }
      })
      .catch((err: Error) => {
        this.logger.error('Error al conectar a MySQL: ' + err.message);
      });
  }

  // Tablas que se agregaron después del script original (smseguro_db.sql).
  // CREATE TABLE IF NOT EXISTS: si ya existen, no hace nada.
  private async crearTablasFaltantes(conn: mysql.PoolConnection) {
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
  }

  // Ejecuta un SELECT y regresa las filas ya tipadas.
  private async consultar<T>(
    conn: mysql.PoolConnection,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const [filas] = await conn.query(sql, params);
    return filas as T[];
  }

  // Crea (si no existe) un usuario demo. La contraseña NO está en el código:
  // se lee de la variable SEED_DEMO_PASSWORD del .env y se hashea aquí con
  // bcrypt, igual que en el registro. Regresa el id del usuario.
  private async asegurarUsuarioDemo(
    conn: mysql.PoolConnection,
    nombre: string,
    correo: string,
    idRol: number,
    contrasena: string,
  ): Promise<number> {
    const existentes = await this.consultar<{
      id_usuario: number;
      contrasena_hash: string;
    }>(
      conn,
      'SELECT id_usuario, contrasena_hash FROM usuario WHERE correo_electronico = ? ORDER BY id_usuario LIMIT 1',
      [correo],
    );
    if (existentes.length > 0) {
      // Versiones anteriores del seed guardaban un hash inválido; si la
      // contraseña demo no coincide, lo corregimos para poder iniciar sesión.
      const coincide = await bcrypt
        .compare(contrasena, existentes[0].contrasena_hash)
        .catch(() => false);
      if (!coincide) {
        await conn.query(
          'UPDATE usuario SET contrasena_hash = ? WHERE correo_electronico = ?',
          [await bcrypt.hash(contrasena, 10), correo],
        );
      }
      return existentes[0].id_usuario;
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const [resultado] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario, activo)
       VALUES (?, ?, ?, ?, 1)`,
      [nombre, correo, hash, idRol],
    );
    return resultado.insertId;
  }

  // Llena la base con datos de ejemplo para que todo el equipo tenga lo mismo
  // al hacer pull y levantar el backend. Es idempotente: se puede correr
  // muchas veces sin duplicar nada (se apoya en columnas UNIQUE y en
  // comprobaciones previas).
  private async sembrarDatosIniciales(conn: mysql.PoolConnection) {
    const contrasenaDemo = process.env.SEED_DEMO_PASSWORD;
    if (!contrasenaDemo) {
      this.logger.warn(
        'Seed omitido: agrega SEED_DEMO_PASSWORD a tu .env (ver .env.example) para crear los datos de ejemplo.',
      );
      return;
    }

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

      // Rol 1 = Ciudadano, 2 = Analista (cat_rol_usuario)
      const idCiudadano = await this.asegurarUsuarioDemo(
        conn,
        'ciudadano_demo',
        'ciudadano.demo@smseguro.com',
        1,
        contrasenaDemo,
      );
      const idVecina = await this.asegurarUsuarioDemo(
        conn,
        'vecina_demo',
        'vecina.demo@smseguro.com',
        1,
        contrasenaDemo,
      );
      const idAnalista = await this.asegurarUsuarioDemo(
        conn,
        'analista_demo',
        'analista.demo@smseguro.com',
        2,
        contrasenaDemo,
      );

      const categorias = await this.consultar<{
        id_tipo_fraude: number;
        nombre_tipo: string;
      }>(conn, 'SELECT id_tipo_fraude, nombre_tipo FROM cat_tipo_fraude');
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
      const c = idCiudadano;
      const v = idVecina;

      // Estados: 1 = Pendiente, 2 = Aprobado, 3 = Rechazado
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
          c,
          b,
          c,
          b,
          v,
          b,
          c,
          b,
          c,
          b,
          v,
          p,
          c,
          p,
          v,
          p,
          c,
          o,
          v,
          m,
          c,
          pr,
          v,
          e,
        ],
      );

      // Tipo de dato: 1 = Telefono, 2 = URL
      await conn.query(`
        INSERT IGNORE INTO indicador (id_tipo_dato, valor_dato, activo) VALUES
          (2, 'https://acceso-seguro-banca-mx.com/login', 1),
          (2, 'https://rastreo-aduana-envios.net/pago', 1),
          (2, 'https://fotomultas-cdmx-pago.com/liquidar', 1),
          (1, '+52 55 8910 2345', 1),
          (1, '+52 55 4432 1987', 1)
      `);

      // Rol del indicador: 1 = Remitente (teléfono), 2 = Enlace (URL)
      const ligas: [string, number, string[]][] = [
        [
          'https://acceso-seguro-banca-mx.com/login',
          2,
          ['SMS-SEED0001', 'SMS-SEED0002', 'SMS-SEED0003'],
        ],
        [
          'https://rastreo-aduana-envios.net/pago',
          2,
          ['SMS-SEED0006', 'SMS-SEED0007'],
        ],
        ['https://fotomultas-cdmx-pago.com/liquidar', 2, ['SMS-SEED0010']],
        ['+52 55 8910 2345', 1, ['SMS-SEED0001', 'SMS-SEED0009']],
        ['+52 55 4432 1987', 1, ['SMS-SEED0006', 'SMS-SEED0011']],
      ];
      for (const [valor, rol, folios] of ligas) {
        await conn.query(
          `INSERT IGNORE INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador)
           SELECT r.id_reporte, i.id_indicador, ?
             FROM reporte r
             JOIN indicador i ON i.valor_dato = ?
            WHERE r.folio_publico IN (?)`,
          [rol, valor, folios],
        );
      }

      // Dictámenes congruentes con el estado (resolución 1 = Aprobado, 2 = Rechazado)
      await conn.query(
        `INSERT IGNORE INTO dictamen (id_reporte, id_analista, id_resolucion, motivo_rechazo, fecha_evaluacion)
         SELECT id_reporte, ?, 1, NULL, NOW()
           FROM reporte
          WHERE folio_publico LIKE 'SMS-SEED%' AND id_estado_actual = 2`,
        [idAnalista],
      );
      await conn.query(
        `INSERT IGNORE INTO dictamen (id_reporte, id_analista, id_resolucion, motivo_rechazo, fecha_evaluacion)
         SELECT id_reporte, ?, 2, 'El mensaje es legitimo y no contiene enlaces sospechosos.', NOW()
           FROM reporte
          WHERE folio_publico LIKE 'SMS-SEED%' AND id_estado_actual = 3`,
        [idAnalista],
      );

      // Comunidad: algunos "+1" (la PK evita duplicados) y comentarios de ejemplo
      await conn.query(
        `INSERT IGNORE INTO reporte_mismo_caso (id_reporte, id_usuario)
         SELECT id_reporte, ? FROM reporte
          WHERE folio_publico IN ('SMS-SEED0001', 'SMS-SEED0006', 'SMS-SEED0009')`,
        [idVecina],
      );
      const comentariosSeed = await this.consultar<{ total: number }>(
        conn,
        `SELECT COUNT(*) AS total
           FROM comentario_reporte cr
           JOIN reporte r ON r.id_reporte = cr.id_reporte
          WHERE r.folio_publico LIKE 'SMS-SEED%'`,
      );
      if (Number(comentariosSeed[0]?.total ?? 0) === 0) {
        await conn.query(
          `INSERT INTO comentario_reporte (id_reporte, id_usuario, contenido)
           SELECT r.id_reporte, x.id_usuario, x.contenido
             FROM (
               SELECT 'SMS-SEED0001' AS folio, ? AS id_usuario, 'A mi me llego el mismo SMS ayer, casi meto mi NIP.' AS contenido
               UNION ALL SELECT 'SMS-SEED0001', ?, 'Gracias por reportarlo, ya avise a mi familia.'
               UNION ALL SELECT 'SMS-SEED0006', ?, 'Me pidieron $49 igual, el numero era +52 55 4432 1987.'
             ) x
             JOIN reporte r ON r.folio_publico = x.folio`,
          [idVecina, idCiudadano, idVecina],
        );
      }

      const consejosExistentes = await this.consultar<{ total: number }>(
        conn,
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

      this.logger.log('Datos de ejemplo listos (seed).');
    } catch (err) {
      this.logger.warn('Aviso en seed inicial: ' + (err as Error).message);
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
