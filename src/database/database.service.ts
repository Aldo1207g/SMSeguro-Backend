import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

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
            contenido VARCHAR(500) NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
          )
        `);

        conn.release();
      })
      .catch((err) => {
        this.logger.error('Error al conectar a MySQL:', err.message);
      });
  }

  async query(sql: string, params: any[] = []) {
    const [results] = await this.pool.execute(sql, params);
    return results;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}