import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearConsejoDto {
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  titulo: string;

  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  @IsString({ message: 'El contenido debe ser texto' })
  contenido: string;
}
