import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from './jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const header: string = request.headers.authorization ?? '';

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token');
    }

    const token = header.slice('Bearer '.length);

    const payload = verify(token);

    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    request.user = payload;

    return true;
  }
}