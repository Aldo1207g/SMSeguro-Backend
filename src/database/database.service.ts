import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mysql.Pool;

  onModuleInit() {
    this.pool = mysql.createPool({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root', 
      database: 'smseguro',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.pool.getConnection()
      .then((conn) => {
        this.logger.log('Conexión exitosa a la base de datos MySQL (smseguro)');
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