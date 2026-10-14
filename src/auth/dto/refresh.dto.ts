import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  @IsString()
  refreshToken: string;
}