import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ReportesRepository } from './reportes.repository';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import type { JwtPayload } from '../auth/jwt';

// Campos del archivo que nos interesan (los manda multer)
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const TAM_MAXIMO = 5 * 1024 * 1024; // 5 MB (igual que el CHECK de la tabla)

// cat_estado_reporte: 1 = Pendiente
const ESTADO_PENDIENTE = 1;
// Roles que pueden ver el detalle de cualquier reporte (para dictaminarlo)
const ROLES_REVISORES = ['Analista', 'Administrador'];

@Injectable()
export class ReportesService {
  constructor(private readonly reportesRepository: ReportesRepository) {}

  prueba() {
    return {
      mensaje: 'Módulo de reportes funcionando',
    };
  }

  async contarReportes() {
    return this.reportesRepository.contarReportes();
  }

  async misEstadisticas(idUsuario: number) {
    const total = await this.reportesRepository.contarPorUsuario(idUsuario);

    return {
      total_reportes: total,
    };
  }

  // GET /reportes/pendientes -> bandeja del analista (solo Analista / Admin)
  async reportesPorEstado(idEstado: number) {
    const filas = await this.reportesRepository.listarPorEstado(idEstado);

    return filas.map((fila) => ({
      id_reporte: fila.id_reporte,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      url: fila.url,
      fecha_creacion: fila.fecha_creacion,
      reportado_por: fila.reportado_por,
    }));
  }

  async reportesPendientes() {
    const filas = await this.reportesRepository.listarPendientes();

    return filas.map((fila) => ({
      id_reporte: fila.id_reporte,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      url: fila.url,
      fecha_creacion: fila.fecha_creacion,
      reportado_por: fila.reportado_por,
    }));
  }

  // GET /reportes/mis-reportes -> lista de reportes del usuario logueado
  async misReportes(idUsuario: number) {
    const filas = await this.reportesRepository.listarPorUsuario(idUsuario);

    return filas.map((fila) => ({
      id_reporte: fila.id_reporte,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      url: fila.url,
      telefono: fila.telefono,
      fecha_creacion: fila.fecha_creacion,
      id_estado_actual: fila.id_estado_actual,
      nombre_estado: fila.nombre_estado,
    }));
  }

  // GET /reportes/estadisticas/dashboard (solo Analista / Administrador)
  async dashboard() {
    const filas = await this.reportesRepository.conteoPorCategoriaYEstado();

    // 1. Detalle categoria x estado (para la grafica de barras agrupada)
    const detalle: {
      id_tipo_fraude: number;
      nombre_tipo: string | null;
      id_estado_reporte: number;
      nombre_estado: string;
      total: number;
    }[] = [];
    let totalReportes = 0;
    for (const fila of filas) {
      const total = Number(fila.total); // COUNT() llega como texto/BIGINT
      totalReportes += total;
      detalle.push({
        id_tipo_fraude: fila.id_tipo_fraude,
        nombre_tipo: fila.nombre_tipo,
        id_estado_reporte: fila.id_estado_reporte,
        nombre_estado: fila.nombre_estado,
        total,
      });
    }

    // 2. Totales por categoria: sumamos los 3 estados de cada categoria
    const porCategoria: {
      id_tipo_fraude: number;
      nombre_tipo: string | null;
      total: number;
    }[] = [];
    for (const d of detalle) {
      let cat = porCategoria.find((c) => c.id_tipo_fraude === d.id_tipo_fraude);
      if (!cat) {
        cat = {
          id_tipo_fraude: d.id_tipo_fraude,
          nombre_tipo: d.nombre_tipo,
          total: 0,
        };
        porCategoria.push(cat);
      }
      cat.total += d.total;
    }

    // 3. Totales por estado: sumamos todas las categorias de cada estado
    const porEstado: {
      id_estado_reporte: number;
      nombre_estado: string;
      total: number;
    }[] = [];
    for (const d of detalle) {
      let est = porEstado.find(
        (e) => e.id_estado_reporte === d.id_estado_reporte,
      );
      if (!est) {
        est = {
          id_estado_reporte: d.id_estado_reporte,
          nombre_estado: d.nombre_estado,
          total: 0,
        };
        porEstado.push(est);
      }
      est.total += d.total;
    }

    return {
      total_reportes: totalReportes,
      por_categoria: porCategoria,
      por_estado: porEstado,
      detalle,
    };
  }

  // POST /reportes
  async crear(dto: CrearReporteDto, idUsuario: number) {
    const existe = await this.reportesRepository.existeTipoFraude(
      dto.id_tipo_fraude,
    );
    if (!existe) {
      throw new BadRequestException('La categoría indicada no existe');
    }

    // Debe venir al menos una URL o un telefono/remitente
    const url = dto.url?.trim() ?? '';
    const telefono = dto.telefono?.trim() ?? '';
    if (url === '' && telefono === '') {
      throw new BadRequestException(
        'Debes reportar al menos una URL o un teléfono/remitente',
      );
    }

    const folio = this.generarFolio();
    const idReporte = await this.reportesRepository.crear(
      idUsuario,
      folio,
      dto.descripcion,
      dto.id_tipo_fraude,
    );

    // Si el usuario puso una URL, se guarda como indicador "Enlace"
    if (url !== '') {
      await this.reportesRepository.reemplazarUrl(idReporte, url);
    }

    // Si el usuario puso un telefono/remitente, lo guardamos como indicador
    if (telefono !== '') {
      await this.reportesRepository.reemplazarTelefono(idReporte, telefono);
    }

    return {
      mensaje: 'Reporte creado exitosamente',
      reporte: await this.reportesRepository.buscarDetalle(idReporte),
    };
  }

  // Folio público de 12 caracteres (CHAR(12)), ej. "SMS-7K2QX9AB"
  private generarFolio(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      codigo += caracteres[indice];
    }
    return 'SMS-' + codigo;
  }

  // POST /reportes/:id/captura -> guarda una foto de evidencia del reporte
  async subirCaptura(idReporte: number, archivo?: ArchivoSubido) {
    // 1. Que venga un archivo
    if (!archivo) {
      throw new BadRequestException('No se envió ninguna imagen');
    }

    // 2. Que sea una imagen y no pese más de 5 MB
    if (!archivo.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }
    if (archivo.size > TAM_MAXIMO) {
      throw new BadRequestException('La imagen no puede pesar más de 5 MB');
    }

    // 3. Que el reporte exista (obtenerReporte lanza 404 si no)
    await this.obtenerReporte(idReporte);

    // 4. Calcular el hash (huella única) del archivo
    const hash = createHash('sha256').update(archivo.buffer).digest('hex');

    // 5. Guardar el archivo en la carpeta uploads/
    const carpeta = 'uploads';
    fs.mkdirSync(carpeta, { recursive: true });
    const extension = archivo.mimetype === 'image/png' ? 'png' : 'jpg';
    const nombreArchivo = `${hash}.${extension}`;
    const rutaArchivo = path.join(carpeta, nombreArchivo);
    fs.writeFileSync(rutaArchivo, archivo.buffer);

    // 6. Registrar la captura en la base de datos
    try {
      const idCaptura = await this.reportesRepository.crearCaptura(
        idReporte,
        rutaArchivo,
        archivo.size,
        archivo.mimetype,
        hash,
      );

      return {
        mensaje: 'Evidencia subida exitosamente',
        id_captura: idCaptura,
        ruta_archivo: rutaArchivo,
      };
    } catch (error) {
      // El hash es UNIQUE: si ya existe esa misma imagen, avisamos
      if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Esta imagen ya fue subida antes');
      }
      throw new InternalServerErrorException('Error al guardar la evidencia');
    }
  }

  // Devuelve la ruta y el tipo de la foto de evidencia para poder mostrarla
  async obtenerCaptura(idReporte: number) {
    const captura = await this.reportesRepository.buscarCaptura(idReporte);
    if (!captura) {
      throw new NotFoundException('Este reporte no tiene foto de evidencia');
    }

    const rutaAbsoluta = path.resolve(captura.ruta_archivo);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new NotFoundException('No se encontro el archivo de la evidencia');
    }

    return { ruta: rutaAbsoluta, mimeType: captura.mime_type };
  }

  // GET /reportes/:id
  async verDetalle(idReporte: number, user: JwtPayload) {
    const reporte = await this.obtenerReporte(idReporte);

    const esAutor = reporte.id_usuario === user.sub;
    const esRevisor = ROLES_REVISORES.includes(user.rol);
    if (!esAutor && !esRevisor) {
      throw new ForbiddenException('No tienes permiso para ver este reporte');
    }

    return reporte;
  }

  // PATCH /reportes/:id
  async editar(
    idReporte: number,
    dto: ActualizarReporteDto,
    idUsuario: number,
  ) {
    const reporte = await this.obtenerReporteEditable(idReporte, idUsuario);

    if (
      dto.url === undefined &&
      dto.descripcion === undefined &&
      dto.id_tipo_fraude === undefined
    ) {
      throw new BadRequestException('No enviaste ningún dato para actualizar');
    }

    if (dto.id_tipo_fraude !== undefined) {
      const existe = await this.reportesRepository.existeTipoFraude(
        dto.id_tipo_fraude,
      );
      if (!existe) {
        throw new BadRequestException('La categoría indicada no existe');
      }
    }

    // Si un campo no viene en el body, dejamos el valor que ya tenía el reporte
    const descripcion = dto.descripcion ?? reporte.descripcion;
    const idTipoFraude = dto.id_tipo_fraude ?? reporte.id_tipo_fraude;

    await this.reportesRepository.actualizarDatos(
      idReporte,
      descripcion,
      idTipoFraude,
    );

    if (dto.url !== undefined) {
      await this.reportesRepository.reemplazarUrl(idReporte, dto.url);
    }

    return {
      mensaje: 'Reporte actualizado exitosamente',
      reporte: await this.reportesRepository.buscarDetalle(idReporte),
    };
  }

  // DELETE /reportes/:id
  async eliminar(idReporte: number, idUsuario: number) {
    await this.obtenerReporteEditable(idReporte, idUsuario);
    await this.reportesRepository.desactivar(idReporte);

    return {
      mensaje: 'Reporte eliminado exitosamente',
      id_reporte: idReporte,
    };
  }

  // 404 si el reporte no existe o ya fue eliminado
  private async obtenerReporte(idReporte: number) {
    const reporte = await this.reportesRepository.buscarDetalle(idReporte);
    if (!reporte) {
      throw new NotFoundException(`No existe el reporte con id ${idReporte}`);
    }
    return reporte;
  }

  // Solo el autor puede editar/eliminar, y solo mientras siga "Pendiente":
  // si ya fue dictaminado, cambiarlo invalidaría la decisión del analista.
  private async obtenerReporteEditable(idReporte: number, idUsuario: number) {
    const reporte = await this.obtenerReporte(idReporte);

    if (reporte.id_usuario !== idUsuario) {
      throw new ForbiddenException(
        'Solo el autor del reporte puede modificarlo',
      );
    }
    if (reporte.id_estado_actual !== ESTADO_PENDIENTE) {
      throw new ConflictException(
        'El reporte ya fue dictaminado y no se puede modificar',
      );
    }

    return reporte;
  }
}
