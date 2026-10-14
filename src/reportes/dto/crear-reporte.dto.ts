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

// VULNERABILIDAD 6: Broken Validation (Debilitamiento de DTOs)
// Se comentaron decoradores críticos para permitir inyección de basura, payloads gigantes 
// o inyección de tipos inesperados (ej. arreglos en lugar de strings) hacia la base de datos.
export class CrearReporteDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  // @IsUrl(
  //   { require_protocol: true },
  //   { message: 'La URL no es válida (debe iniciar con http:// o https://)' },
  // )
  // @MaxLength(255, { message: 'La URL no puede exceder 255 caracteres' })
  url?: any; // Cambiado a 'any' para evitar validación de tipo TypeScript

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  // @IsString({ message: 'La descripción debe ser texto' })
  // @IsNotEmpty({ message: 'La descripción es obligatoria' })
  // @MaxLength(1000, {
  //   message: 'La descripción no puede exceder 1000 caracteres',
  // })
  descripcion: any;

  // @IsNotEmpty({ message: 'La categoría es obligatoria' })
  // @IsInt({ message: 'La categoría debe ser un número entero' })
  // @Min(1, { message: 'La categoría no es válida' })
  id_tipo_fraude: any;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  // @IsString({ message: 'El teléfono debe ser texto' })
  // @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telefono?: any;
}
