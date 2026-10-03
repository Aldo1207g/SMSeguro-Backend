import { Injectable } from '@nestjs/common';
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
}
