import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificacionesRepository } from './notificaciones.repository';

// Estados del reporte (cat_estado_reporte)
const ESTADO_APROBADO = 2;

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly repo: NotificacionesRepository) {}

  async listar(idUsuario: number) {
    const filas = await this.repo.listar(idUsuario);
    return filas.map((f) => ({
      id_notificacion: f.id_notificacion,
      id_reporte: f.id_reporte,
      titulo: f.titulo,
      mensaje: f.mensaje,
      leida: Number(f.leida) === 1,
      fecha_creacion: f.fecha_creacion,
    }));
  }

  async noLeidas(idUsuario: number) {
    return { no_leidas: await this.repo.contarNoLeidas(idUsuario) };
  }

  async marcarLeida(idNotificacion: number, idUsuario: number) {
    const ok = await this.repo.marcarLeida(idNotificacion, idUsuario);
    if (!ok) {
      throw new NotFoundException('No existe esa notificación');
    }
    return { mensaje: 'Notificación marcada como leída' };
  }

  async marcarTodas(idUsuario: number) {
    await this.repo.marcarTodas(idUsuario);
    return { mensaje: 'Todas las notificaciones se marcaron como leídas' };
  }

  // Se llama cuando un analista dictamina un reporte. Si algo falla aquí no
  // debe tumbar el dictamen, por eso solo se registra el error.
  async avisarCambioDeEstado(
    idReporte: number,
    nuevoEstado: number,
    motivoRechazo: string | null,
  ): Promise<void> {
    try {
      const idAutor = await this.repo.autorDeReporte(idReporte);
      if (idAutor === null) return;

      const aprobado = nuevoEstado === ESTADO_APROBADO;
      const titulo = aprobado
        ? 'Tu reporte fue aprobado'
        : 'Tu reporte fue rechazado';
      const mensaje = aprobado
        ? `Un analista confirmó tu reporte #${idReporte} como fraude. ¡Gracias por ayudar a la comunidad!`
        : `Tu reporte #${idReporte} fue rechazado. Motivo: ${motivoRechazo ?? 'sin motivo'}`;

      await this.repo.crear(idAutor, idReporte, titulo, mensaje);
    } catch (error) {
      this.logger.error(
        'No se pudo crear la notificación: ' + (error as Error).message,
      );
    }
  }
}
