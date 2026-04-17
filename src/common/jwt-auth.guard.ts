import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import type { Request } from 'express';
import type { AuthJwtPayload, RequestUser } from './auth.types';

type RequestWithUser = Request & { user?: RequestUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token.',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token.',
      });
    }

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret',
    );

    let payload: AuthJwtPayload;
    try {
      payload = verify(token, accessSecret) as AuthJwtPayload;
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token.',
      });
    }

    if (!payload || payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload.',
      });
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    return true;
  }
}

