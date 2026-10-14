import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

// PATCH: todos los campos son opcionales, solo se actualiza lo que llegue
export class ActualizarReporteDto {
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'La URL no es válida (debe iniciar con http:// o https://)' },
  )
  @MaxLength(255, { message: 'La URL no puede exceder 255 caracteres' })
  url?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: 'La categoría debe ser un número entero' })
  @Min(1, { message: 'La categoría no es válida' })
  id_tipo_fraude?: number;
}
