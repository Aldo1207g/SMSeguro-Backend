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
import { randomInt } from 'node:crypto';
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
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
      codigo += caracteres[randomInt(caracteres.length)];
    }
    return `SMS-${codigo}`;
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
    await this.obtenerReporteEditable(idReporte, idUsuario);

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

    await this.reportesRepository.actualizarDatos(
      idReporte,
      dto.descripcion ?? null,
      dto.id_tipo_fraude ?? null,
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
