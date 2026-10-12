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

// POST /reportes: mismos campos que el formulario NuevoReporteView de la app.
// La URL y el telefono son opcionales por separado, pero el servicio exige
// que venga al menos uno de los dos (es una app contra smishing).
export class CrearReporteDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl(
    { require_protocol: true },
    { message: 'La URL no es válida (debe iniciar con http:// o https://)' },
  )
  @MaxLength(255, { message: 'La URL no puede exceder 255 caracteres' })
  url?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  descripcion: string;

  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsInt({ message: 'La categoría debe ser un número entero' })
  @Min(1, { message: 'La categoría no es válida' })
  id_tipo_fraude: number;

  // Numero/remitente del SMS (opcional). Se guarda como indicador "Telefono".
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telefono?: string;
}
