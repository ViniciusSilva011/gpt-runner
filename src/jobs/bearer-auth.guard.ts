import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class BearerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const apiKey = process.env.ACTION_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Server misconfigured: ACTION_API_KEY is not set.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (authorization !== `Bearer ${apiKey}`) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
