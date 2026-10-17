import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

// Paso 1: el usuario pide un código de recuperación
export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El correo ingresado no es válido' })
  correo_electronico: string;
}

// Paso 2: manda el código que recibió + su nueva contraseña
export class ResetPasswordDto {
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El correo ingresado no es válido' })
  correo_electronico: string;

  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;

  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @IsString()
  @MinLength(10, {
    message: 'La nueva contraseña debe contener al menos 10 caracteres',
  })
  nueva_contrasena: string;
}
