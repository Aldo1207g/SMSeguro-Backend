import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearComentarioDto {
  // El autor se obtiene del JWT; aquí solo recibimos el texto.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El comentario debe ser texto' })
  @IsNotEmpty({ message: 'El comentario no puede estar vacío' })
  @MaxLength(1000, {
    message: 'El comentario no puede exceder 1000 caracteres',
  })
  contenido: string;
}