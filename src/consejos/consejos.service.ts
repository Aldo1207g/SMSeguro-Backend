import { Injectable } from '@nestjs/common';
import { ConsejosRepository } from './consejos.repository';
import { CrearConsejoDto } from './dto/crear-consejo.dto';

@Injectable()
export class ConsejosService {
  constructor(private readonly consejosRepository: ConsejosRepository) {}

  async listar() {
    return this.consejosRepository.listar();
  }

  async crear(idAnalista: number, dto: CrearConsejoDto) {
    const id = await this.consejosRepository.crear(
      idAnalista,
      dto.titulo,
      dto.contenido,
    );
    return { mensaje: 'Consejo publicado exitosamente', id_consejo: id };
  }
}
