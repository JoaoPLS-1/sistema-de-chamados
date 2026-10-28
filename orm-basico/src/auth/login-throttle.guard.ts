import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly tentativas = new Map<
    string,
    { quantidade: number; ate: number }
  >();

  canActivate(ctx: ExecutionContext) {
    const agora = Date.now();
    for (const [ip, janela] of this.tentativas)
      if (janela.ate <= agora) this.tentativas.delete(ip);
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket.remoteAddress ?? 'local';
    const janela = this.tentativas.get(ip) ?? {
      quantidade: 0,
      ate: agora + 60000,
    };
    if (
      janela.quantidade >= 30 ||
      (!this.tentativas.has(ip) && this.tentativas.size >= 10000)
    )
      throw new HttpException(
        'Muitas tentativas de login; aguarde um minuto',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    janela.quantidade++;
    this.tentativas.set(ip, janela);
    return true;
  }
}
