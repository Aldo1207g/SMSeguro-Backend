import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const RESOLUCION_APROBADO = 1;
export const RESOLUCION_RECHAZADO = 2;

export class CrearDictamenDto {
  @IsNotEmpty({ message: 'La resolución es obligatoria' })
  @IsInt({ message: 'La resolución debe ser un número entero' })
  @Min(1, { message: 'La resolución no es válida' })
  id_resolucion: number;

  // Solo se valida cuando el dictamen es "Rechazado" (id_resolucion = 2).
  // El @Transform quita espacios antes de validar, así "   " cuenta como vacío.
  @ValidateIf((o: CrearDictamenDto) => o.id_resolucion === RESOLUCION_RECHAZADO)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El motivo de rechazo debe ser texto' })
  @IsNotEmpty({
    message:
      'El motivo de rechazo es obligatorio cuando el dictamen es Rechazado',
  })
  @MaxLength(200, {
    message: 'El motivo de rechazo no puede exceder 200 caracteres',
  })
  motivo_rechazo?: string;
}
