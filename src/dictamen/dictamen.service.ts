import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DictamenRepository } from './dictamen.repository';
import {
  CrearDictamenDto,
  RESOLUCION_APROBADO,
  RESOLUCION_RECHAZADO,
} from './dto/crear-dictamen.dto';

// Estados del reporte (cat_estado_reporte)
const ESTADO_APROBADO = 2;
const ESTADO_RECHAZADO = 3;

@Injectable()
export class DictamenService {
  constructor(private readonly dictamenRepository: DictamenRepository) {}

  async crear(idReporte: number, idAnalista: number, dto: CrearDictamenDto) {
    // 1. Validar que el reporte exista y esté activo
    const existeReporte =
      await this.dictamenRepository.existeReporte(idReporte);
    if (!existeReporte) {
      throw new NotFoundException(`No existe el reporte con id ${idReporte}`);
    }

    // 2. Un reporte solo puede tener un dictamen (UNIQUE en id_reporte)
    const yaTieneDictamen =
      await this.dictamenRepository.existeDictamenDeReporte(idReporte);
    if (yaTieneDictamen) {
      throw new ConflictException('Este reporte ya cuenta con un dictamen');
    }

    // 3. Validar que la resolución exista en el catálogo
    const resolucionValida = await this.dictamenRepository.existeResolucion(
      dto.id_resolucion,
    );
    if (!resolucionValida) {
      throw new BadRequestException('La resolución indicada no existe');
    }

    // 4. El motivo solo se guarda si el dictamen es "Rechazado"
    const motivoRechazo =
      dto.id_resolucion === RESOLUCION_RECHAZADO
        ? (dto.motivo_rechazo ?? null)
        : null;

    // 5. Insertar dictamen (el id del analista viene del token, nunca del body)
    try {
      const idDictamen = await this.dictamenRepository.crear(
        idReporte,
        idAnalista,
        dto.id_resolucion,
        motivoRechazo,
      );

      // Cerramos el ciclo: el reporte deja de estar "Pendiente" y pasa
      // a Aprobado o Rechazado, segun la resolucion del analista.
      const nuevoEstado =
        dto.id_resolucion === RESOLUCION_APROBADO
          ? ESTADO_APROBADO
          : ESTADO_RECHAZADO;
      await this.dictamenRepository.actualizarEstadoReporte(
        idReporte,
        nuevoEstado,
      );

      const dictamen = await this.dictamenRepository.buscarPorId(idDictamen);

      return {
        mensaje: 'Dictamen registrado exitosamente',
        dictamen,
      };
    } catch (error) {
      // Por si dos analistas dictaminan el mismo reporte al mismo tiempo
      if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Este reporte ya cuenta con un dictamen');
      }
      throw new InternalServerErrorException('Error al registrar el dictamen');
    }
  }
}
