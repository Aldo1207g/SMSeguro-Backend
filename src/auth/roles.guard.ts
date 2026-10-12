import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt';

// Este guard se usa DESPUES del AuthGuard: el AuthGuard ya validó el token y
// dejó al usuario en request.user. Aquí solo revisamos que sea Analista o
// Administrador; si es Ciudadano, lanzamos 403.
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (user.rol !== 'Analista' && user.rol !== 'Administrador') {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este recurso',
      );
    }

    return true;
  }
}
