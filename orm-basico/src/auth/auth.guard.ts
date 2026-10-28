import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { hashToken } from './senhas.js';
import type { RequisicaoAutenticada } from './auth.decorators.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('auth:publica', alvos))
      return true;
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const partes = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(
      req.headers.authorization ?? '',
    );
    if (!partes)
      throw new UnauthorizedException('Informe um token Bearer válido');
    req.usuario = await this.auth.autenticar(partes[1]);
    req.tokenHash = hashToken(partes[1]);
    if (
      this.reflector.getAllAndOverride<boolean>('auth:tecnicos', alvos) &&
      req.usuario.tipo !== 'TECNICO'
    )
      throw new ForbiddenException('Operação permitida somente para técnicos');
    return true;
  }
}
