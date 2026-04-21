import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BackendAppService } from '../app.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly appService: BackendAppService) {}

  canActivate(context: ExecutionContext): boolean {
	const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
	const authorizationHeader = request.headers?.authorization;
	const authorization = Array.isArray(authorizationHeader)
	  ? authorizationHeader[0]
	  : authorizationHeader;

	if (!authorization?.startsWith('Bearer ')) {
	  throw new UnauthorizedException({
		code: 'UNAUTHORIZED',
		message: 'Missing bearer token.',
	  });
	}

	const token = authorization.slice('Bearer '.length).trim();
	const user = this.appService.getUserFromAccessToken(token);
	if (!user) {
	  throw new UnauthorizedException({
		code: 'UNAUTHORIZED',
		message: 'Access token is invalid or expired.',
	  });
	}

	request.user = user;
	return true;
  }
}

