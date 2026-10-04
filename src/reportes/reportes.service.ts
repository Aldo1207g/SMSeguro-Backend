import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportesRepository } from './reportes.repository';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import type { JwtPayload } from '../auth/jwt';

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

    const folio = this.generarFolio();
    const idReporte = await this.reportesRepository.crear(
      idUsuario,
      folio,
      dto.descripcion,
      dto.id_tipo_fraude,
    );

    // La URL se guarda como indicador "Enlace" del reporte
    await this.reportesRepository.reemplazarUrl(idReporte, dto.url);

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
