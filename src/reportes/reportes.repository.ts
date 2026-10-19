import { Injectable } from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

// cat_tipo_dato: 1 = Telefono, 2 = URL | cat_rol_indicador: 1 = Remitente, 2 = Enlace
const TIPO_DATO_URL = 2;
const ROL_INDICADOR_ENLACE = 2;
const TIPO_DATO_TELEFONO = 1;
const ROL_INDICADOR_REMITENTE = 1;

export interface ConteoCategoriaEstadoRow extends RowDataPacket {
  id_tipo_fraude: number;
  nombre_tipo: string;
  id_estado_reporte: number;
  nombre_estado: string;
  total: number;
}

export interface ReporteListaRow extends RowDataPacket {
  id_reporte: number;
  titulo: string;
  descripcion: string;
  url: string;
  telefono: string;
  fecha_creacion: string;
  id_estado_actual: number;
  nombre_estado: string;
  reportado_por: string;
  mismo_caso_total: number;
}

export interface ReporteComunidadRow extends RowDataPacket {
  id_reporte: number;
  id_usuario: number;
  titulo: string;
  descripcion: string;
  url: string;
  telefono: string;
  fecha_creacion: string;
  id_estado_actual: number;
  nombre_estado: string;
  reportado_por: string;
  mismo_caso_total: number;
}

export interface ReportePendienteRow extends RowDataPacket {
  id_reporte: number;
  titulo: string;
  descripcion: string;
  url: string;
  telefono: string;
  fecha_creacion: string;
  reportado_por: string;
}


export interface ReporteDetalleRow extends RowDataPacket {
  id_reporte: number;
  folio_publico: string;
  id_usuario: number;
  descripcion: string;
  url: string | null;
  id_tipo_fraude: number | null;
  nombre_tipo: string | null;
  id_estado_actual: number;
  nombre_estado: string;
  motivo_rechazo: string | null;
  telefono: string | null;
  fecha_registro: string;
  reportado_por: string;
  mismo_caso_total: number;
}

export interface CapturaRow extends RowDataPacket {
  id_captura: number;
  ruta_archivo: string;
  mime_type: string;
}

export interface ComentarioReporteRow extends RowDataPacket {
  id_comentario: number;
  id_reporte: number;
  autor: string;
  contenido: string;
  fecha_creacion: string;
}

@Injectable()
export class ReportesRepository {
  constructor(private readonly db: DatabaseService) {}

  async contarReportes() {
    const resultado = await this.db.query(
      'SELECT COUNT(*) AS total FROM reporte',
    );

    return resultado;
  }

  // Cuenta los reportes activos que envió un usuario
  async contarPorUsuario(idUsuario: number): Promise<number> {
    const filas = (await this.db.query(
      'SELECT COUNT(*) AS total FROM reporte WHERE id_usuario = ? AND activo = TRUE',
      [idUsuario],
    )) as RowDataPacket[];

    return Number(filas[0].total);
  }

  // Detalle de un reporte activo con su categoría, estado y URL (indicador "Enlace")
  async buscarDetalle(idReporte: number): Promise<ReporteDetalleRow | null> {
    const sql = `
      SELECT r.id_reporte, r.folio_publico, r.id_usuario, r.descripcion,
        u.nombre_usuario AS reportado_por,
        (SELECT COUNT(*)
              FROM reporte_mismo_caso mc
               WHERE mc.id_reporte = r.id_reporte) AS mismo_caso_total,
             (SELECT i.valor_dato
                FROM detalle_reporte dr
                INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
               WHERE dr.id_reporte = r.id_reporte AND dr.id_rol_indicador = ?
               LIMIT 1) AS url,
             (SELECT i.valor_dato
                FROM detalle_reporte dr
                INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
               WHERE dr.id_reporte = r.id_reporte AND dr.id_rol_indicador = ?
               LIMIT 1) AS telefono,
             r.id_tipo_fraude, t.nombre_tipo,
             r.id_estado_actual, e.nombre_estado,
             (SELECT d.motivo_rechazo
                FROM dictamen d
               WHERE d.id_reporte = r.id_reporte
               LIMIT 1) AS motivo_rechazo,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d %H:%i:%s') AS fecha_registro
      FROM reporte r
      INNER JOIN usuario u ON u.id_usuario = r.id_usuario
      LEFT JOIN cat_tipo_fraude t     ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN cat_estado_reporte e ON e.id_estado_reporte = r.id_estado_actual
      WHERE r.id_reporte = ? AND r.activo = TRUE
    `;

    const filas = (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      ROL_INDICADOR_REMITENTE,
      idReporte,
    ])) as ReporteDetalleRow[];

    return filas.length > 0
      ? {
          ...filas[0],
          mismo_caso_total: Number(filas[0].mismo_caso_total),
        }
      : null;
  }

  // Inserta el reporte (estado 1 = Pendiente por DEFAULT) y regresa su id
  async crear(
    idUsuario: number,
    folioPublico: string,
    descripcion: string,
    idTipoFraude: number,
  ): Promise<number> {
    const resultado = (await this.db.query(
      `INSERT INTO reporte (folio_publico, id_usuario, id_tipo_fraude, descripcion, fecha_recepcion)
       VALUES (?, ?, ?, ?, NOW())`,
      [folioPublico, idUsuario, idTipoFraude, descripcion],
    )) as ResultSetHeader;

    return resultado.insertId;
  }

  async existeTipoFraude(idTipoFraude: number): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT id_tipo_fraude FROM cat_tipo_fraude WHERE id_tipo_fraude = ?',
      [idTipoFraude],
    )) as RowDataPacket[];

    return filas.length > 0;
  }

  // Actualiza la descripción y la categoría del reporte.
  async actualizarDatos(
    idReporte: number,
    descripcion: string,
    idTipoFraude: number | null,
  ): Promise<void> {
    await this.db.query(
      'UPDATE reporte SET descripcion = ?, id_tipo_fraude = ? WHERE id_reporte = ?',
      [descripcion, idTipoFraude, idReporte],
    );
  }

  // La URL vive en la tabla indicador (valor_dato es UNIQUE y puede compartirse
  // entre reportes), así que NO se edita el indicador viejo: se busca o crea el
  // indicador de la nueva URL y se cambia el enlace en detalle_reporte.
  async reemplazarUrl(idReporte: number, url: string): Promise<void> {
    const existentes = (await this.db.query(
      'SELECT id_indicador FROM indicador WHERE valor_dato = ?',
      [url],
    )) as RowDataPacket[];

    let idIndicador: number;
    if (existentes.length > 0) {
      idIndicador = Number(existentes[0].id_indicador);
    } else {
      const insertado = (await this.db.query(
        'INSERT INTO indicador (id_tipo_dato, valor_dato) VALUES (?, ?)',
        [TIPO_DATO_URL, url],
      )) as ResultSetHeader;
      idIndicador = insertado.insertId;
    }

    await this.db.query(
      'DELETE FROM detalle_reporte WHERE id_reporte = ? AND id_rol_indicador = ?',
      [idReporte, ROL_INDICADOR_ENLACE],
    );

    await this.db.query(
      'INSERT INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador) VALUES (?, ?, ?)',
      [idReporte, idIndicador, ROL_INDICADOR_ENLACE],
    );
  }

  // Guarda el telefono/remitente como indicador "Telefono" con rol "Remitente"
  async reemplazarTelefono(idReporte: number, telefono: string): Promise<void> {
    const existentes = (await this.db.query(
      'SELECT id_indicador FROM indicador WHERE valor_dato = ?',
      [telefono],
    )) as RowDataPacket[];

    let idIndicador: number;
    if (existentes.length > 0) {
      idIndicador = Number(existentes[0].id_indicador);
    } else {
      const insertado = (await this.db.query(
        'INSERT INTO indicador (id_tipo_dato, valor_dato) VALUES (?, ?)',
        [TIPO_DATO_TELEFONO, telefono],
      )) as ResultSetHeader;
      idIndicador = insertado.insertId;
    }

    await this.db.query(
      'DELETE FROM detalle_reporte WHERE id_reporte = ? AND id_rol_indicador = ?',
      [idReporte, ROL_INDICADOR_REMITENTE],
    );

    await this.db.query(
      'INSERT INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador) VALUES (?, ?, ?)',
      [idReporte, idIndicador, ROL_INDICADOR_REMITENTE],
    );
  }

  // Borrado lógico: el registro se conserva (dictamen, capturas e historial
  // dependen de él) pero deja de aparecer en la app y en las estadísticas
  async desactivar(idReporte: number): Promise<void> {
    await this.db.query(
      'UPDATE reporte SET activo = FALSE WHERE id_reporte = ?',
      [idReporte],
    );
  }

  // Guarda los datos de una foto de evidencia en la tabla captura
  async crearCaptura(
    idReporte: number,
    rutaArchivo: string,
    tamanoBytes: number,
    mimeType: string,
    hashArchivo: string,
  ): Promise<number> {
    const sql = `
      INSERT INTO captura (id_reporte, ruta_archivo, tamano_bytes, mime_type, hash_archivo)
      VALUES (?, ?, ?, ?, ?)
    `;

    const resultado = (await this.db.query(sql, [
      idReporte,
      rutaArchivo,
      tamanoBytes,
      mimeType,
      hashArchivo,
    ])) as ResultSetHeader;

    return resultado.insertId;
  }

  // Cuando el reporte ya tenía foto, se sobreescribe esa misma fila con la nueva
  async reemplazarCaptura(
    idCaptura: number,
    rutaArchivo: string,
    tamanoBytes: number,
    mimeType: string,
    hashArchivo: string,
  ): Promise<void> {
    const sql = `
      UPDATE captura
         SET ruta_archivo = ?, tamano_bytes = ?, mime_type = ?, hash_archivo = ?
       WHERE id_captura = ?
    `;

    await this.db.query(sql, [
      rutaArchivo,
      tamanoBytes,
      mimeType,
      hashArchivo,
      idCaptura,
    ]);
  }

  // Trae la foto de evidencia mas reciente de un reporte (o null si no tiene)
  async buscarCaptura(idReporte: number): Promise<CapturaRow | null> {
    const sql = `
      SELECT id_captura, ruta_archivo, mime_type
      FROM captura
      WHERE id_reporte = ?
      ORDER BY id_captura DESC
      LIMIT 1
    `;
    const filas = (await this.db.query(sql, [idReporte])) as CapturaRow[];
    return filas.length > 0 ? filas[0] : null;
  }

  // Lista TODOS los reportes pendientes (estado 1) para que el analista los revise.
  // Incluye quién lo reportó. Los más viejos salen primero.
  // Lista los reportes de un estado dado (1=Pendiente, 2=Aprobado, 3=Rechazado).
  async listarPorEstado(idEstado: number): Promise<ReportePendienteRow[]> {
    const sql = `
      SELECT r.id_reporte,
             IFNULL(t.nombre_tipo, 'Sin categoria') AS titulo,
             r.descripcion,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS url,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d') AS fecha_creacion,
             u.nombre_usuario AS reportado_por
      FROM reporte r
      LEFT JOIN cat_tipo_fraude t ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN usuario u        ON u.id_usuario = r.id_usuario
      WHERE r.id_estado_actual = ? AND r.activo = TRUE
      ORDER BY r.fecha_registro DESC
    `;

    return (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      idEstado,
    ])) as ReportePendienteRow[];
  }

  async listarPendientes(): Promise<ReportePendienteRow[]> {
    const sql = `
      SELECT r.id_reporte,
             IFNULL(t.nombre_tipo, 'Sin categoria') AS titulo,
             r.descripcion,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS url,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS telefono,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d') AS fecha_creacion,
             u.nombre_usuario AS reportado_por
      FROM reporte r
      LEFT JOIN cat_tipo_fraude t ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN usuario u        ON u.id_usuario = r.id_usuario
      WHERE r.id_estado_actual = 1 AND r.activo = TRUE
      ORDER BY r.fecha_registro ASC
    `;

    return (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      ROL_INDICADOR_REMITENTE,
    ])) as ReportePendienteRow[];
  }

  // Lista los reportes activos de un usuario, con el formato que necesita la app
  async listarPorUsuario(idUsuario: number): Promise<ReporteListaRow[]> {
    const sql = `
      SELECT r.id_reporte,
             IFNULL(t.nombre_tipo, 'Sin categoria') AS titulo,
             r.descripcion,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS url,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS telefono,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d') AS fecha_creacion,
             r.id_estado_actual,
             e.nombre_estado,
             u.nombre_usuario AS reportado_por,
             (SELECT COUNT(*)
                FROM reporte_mismo_caso mc
                WHERE mc.id_reporte = r.id_reporte) AS mismo_caso_total
      FROM reporte r
      INNER JOIN usuario u ON u.id_usuario = r.id_usuario
      LEFT JOIN cat_tipo_fraude t     ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN cat_estado_reporte e ON e.id_estado_reporte = r.id_estado_actual
      WHERE r.id_usuario = ? AND r.activo = TRUE
      ORDER BY r.fecha_registro DESC
    `;

    const filas = (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      ROL_INDICADOR_REMITENTE,
      idUsuario,
    ])) as ReporteListaRow[];

    return filas.map((fila) => ({
      ...fila,
      mismo_caso_total: Number(fila.mismo_caso_total),
    }));
  }

  // Muro global: reportes activos de los últimos 14 días, de todos los usuarios.
  // Se trae id_usuario solo para calcular es_mio en el servicio.
  async listarComunidad(): Promise<ReporteComunidadRow[]> {
    const sql = `
      SELECT r.id_reporte,
             r.id_usuario,
             IFNULL(t.nombre_tipo, 'Sin categoria') AS titulo,
             r.descripcion,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS url,
             IFNULL((SELECT i.valor_dato
                       FROM detalle_reporte dr
                       INNER JOIN indicador i ON i.id_indicador = dr.id_indicador
                      WHERE dr.id_reporte = r.id_reporte
                        AND dr.id_rol_indicador = ?
                      LIMIT 1), '') AS telefono,
             DATE_FORMAT(r.fecha_registro, '%Y-%m-%d') AS fecha_creacion,
             r.id_estado_actual,
             e.nombre_estado,
             u.nombre_usuario AS reportado_por,
             (SELECT COUNT(*)
                FROM reporte_mismo_caso mc
               WHERE mc.id_reporte = r.id_reporte) AS mismo_caso_total
      FROM reporte r
      INNER JOIN usuario u ON u.id_usuario = r.id_usuario
      LEFT JOIN cat_tipo_fraude t     ON t.id_tipo_fraude = r.id_tipo_fraude
      INNER JOIN cat_estado_reporte e ON e.id_estado_reporte = r.id_estado_actual
      WHERE r.activo = TRUE
        AND r.fecha_registro >= NOW() - INTERVAL 14 DAY
      ORDER BY r.fecha_registro DESC
    `;

    return (await this.db.query(sql, [
      ROL_INDICADOR_ENLACE,
      ROL_INDICADOR_REMITENTE,
    ])) as ReporteComunidadRow[];
  }

  // Dashboard: cuántos reportes activos hay por cada combinación categoría × estado.
  // CROSS JOIN arma todas las combinaciones de los dos catálogos (9 × 3 = 27) y el
  // LEFT JOIN cuenta los reportes de cada una; así las combinaciones vacías salen en 0.
  async conteoPorCategoriaYEstado(): Promise<ConteoCategoriaEstadoRow[]> {
    const sql = `
      SELECT t.id_tipo_fraude, t.nombre_tipo,
             e.id_estado_reporte, e.nombre_estado,
             COUNT(r.id_reporte) AS total
      FROM cat_tipo_fraude t
      CROSS JOIN cat_estado_reporte e
      LEFT JOIN reporte r
        ON r.id_tipo_fraude = t.id_tipo_fraude
       AND r.id_estado_actual = e.id_estado_reporte
       AND r.activo = TRUE
      GROUP BY t.id_tipo_fraude, t.nombre_tipo, e.id_estado_reporte, e.nombre_estado
      ORDER BY t.id_tipo_fraude, e.id_estado_reporte
    `;

    return (await this.db.query(sql)) as ConteoCategoriaEstadoRow[];
  }

  // Registra un voto. La clave primaria impide duplicarlo,
  // incluso si llegan dos peticiones al mismo tiempo.
  async registrarMismoCaso(
    idReporte: number,
    idUsuario: number,
  ): Promise<boolean> {
    try {
      await this.db.query(
        `INSERT INTO reporte_mismo_caso (id_reporte, id_usuario)
         VALUES (?, ?)`,
        [idReporte, idUsuario],
      );

      return true;
    } catch (error) {
      // Repetir el voto no aumenta el contador ni genera otro registro.
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        return false;
      }

      throw error;
    }
  }

  // Devuelve el total y si el usuario actual ya marcó este reporte.
  async resumenMismoCaso(idReporte: number, idUsuario: number) {
    const filas = (await this.db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(MAX(id_usuario = ?), 0) AS marcado
         FROM reporte_mismo_caso
        WHERE id_reporte = ?`,
      [idUsuario, idReporte],
    )) as (RowDataPacket & {
      total: number | string;
      marcado: number | string;
    })[];

    return {
      mismo_caso_total: Number(filas[0].total),
      mismo_caso_usuario: Number(filas[0].marcado) === 1,
    };
  }

    // Guarda el comentario con el usuario identificado por el servidor.
  async crearComentario(
    idReporte: number,
    idUsuario: number,
    contenido: string,
  ): Promise<number> {
    const resultado = (await this.db.query(
      `INSERT INTO comentario_reporte
         (id_reporte, id_usuario, contenido)
       VALUES (?, ?, ?)`,
      [idReporte, idUsuario, contenido],
    )) as ResultSetHeader;

    return resultado.insertId;
  }

  // Consulta los últimos 100 comentarios activos.
  // Devuelve el nombre del autor, sin exponer su correo.
  async listarComentarios(
    idReporte: number,
  ): Promise<ComentarioReporteRow[]> {
    const filas = (await this.db.query(
      `SELECT c.id_comentario,
              c.id_reporte,
              u.nombre_usuario AS autor,
              c.contenido,
              DATE_FORMAT(
                c.fecha_creacion,
                '%Y-%m-%d %H:%i:%s'
              ) AS fecha_creacion
         FROM comentario_reporte c
         INNER JOIN usuario u ON u.id_usuario = c.id_usuario
        WHERE c.id_reporte = ? AND c.activo = TRUE
        ORDER BY c.id_comentario DESC
        LIMIT 100`,
      [idReporte],
    )) as ComentarioReporteRow[];

    // Dentro de ese grupo, mostramos primero el más antiguo.
    return filas.reverse();
  }
}
