import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @IsString()
  nombre_usuario: string;

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El correo ingresado no es válido' })
  correo_electronico: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  @MinLength(10, { message: 'La contraseña debe contener al menos 10 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).+$/,
    {
      message:
        'La contraseña debe incluir mayúscula, minúscula, número y símbolo especial',
    },
  )
  contrasena: string;
}