import { ConflictException, Injectable } from '@nestjs/common';
import { CategoriasRepository } from './categorias.repository';

@Injectable()
export class CategoriasService {
  constructor(private readonly categoriasRepository: CategoriasRepository) {}

  async listar() {
    const filas = await this.categoriasRepository.listar();

    // Se devuelve solo lo que la app necesita para armar los botones
    return filas.map((fila) => ({
      id_tipo_fraude: fila.id_tipo_fraude,
      nombre_tipo: fila.nombre_tipo,
    }));
  }
  // Crea una categoria nueva (nombre_tipo es UNIQUE: si ya existe, avisamos)
  async crear(nombreTipo: string) {
    try {
      const id = await this.categoriasRepository.crear(nombreTipo);
      return { id_tipo_fraude: id, nombre_tipo: nombreTipo };
    } catch (error) {
      if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Esa categoria ya existe');
      }
      throw error;
    }
  }
}
