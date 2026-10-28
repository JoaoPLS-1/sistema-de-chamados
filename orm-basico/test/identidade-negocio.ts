import type { ExecutionContext } from '@nestjs/common';
export { AuthGuard } from '../src/auth/auth.guard.js';

// Suites de regras isolam a identidade para exercitar cadastros variados.
// auth.e2e-spec.ts usa o guard real e valida o contrato HTTP autenticado.
export const identidadeNegocio = {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.usuario = {
      id: req.body?.autorId ?? req.body?.solicitanteId ?? 0,
      tipo: 'TECNICO',
      nome: 'Identidade de teste',
      email: 'teste@example.com',
    };
    return true;
  },
};
