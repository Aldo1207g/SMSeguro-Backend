import { Transform, Type } from 'class-transformer';
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
  // Si desde iOS escriben "banco-falso.com" (sin protocolo) le anteponemos
  // https:// antes de validarla. Un texto vacío cuenta como "no mandó URL".
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const url = value.trim();
    if (url === '') return undefined;
    return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
  })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'La URL no es válida (ej. banco-falso.com)' },
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

  // Desde form-data o la app puede llegar como texto ("3"), @Type lo pasa a número
  @Type(() => Number)
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
