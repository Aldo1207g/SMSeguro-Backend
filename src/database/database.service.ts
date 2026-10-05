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
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'smseguro',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Probar conexión inicial y crear la tabla de consejos si todavía no existe
    this.pool.getConnection()
      .then(async (conn) => {
        this.logger.log('Conexión exitosa a la base de datos MySQL (smseguro)');
        // La tabla consejo guarda las guías que publican los analistas
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
        conn.release();
      })
      .catch((err) => {
        this.logger.error('Error al conectar a MySQL:', err.message);
      });
  }

  // Hace una consulta a la base de datos y regresa los resultados.
  async query(sql: string, params: any[] = []) {
    const [results] = await this.pool.execute(sql, params);
    return results;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}