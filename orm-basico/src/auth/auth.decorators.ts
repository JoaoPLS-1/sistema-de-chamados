import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TipoPessoa } from '../generated/prisma/enums.js';

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  email: string;
  tipo: TipoPessoa;
};
export type RequisicaoAutenticada = Request & {
  usuario: UsuarioAutenticado;
  tokenHash: string;
};
export const Publica = () => SetMetadata('auth:publica', true);
export const SomenteTecnicos = () => SetMetadata('auth:tecnicos', true);
export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuario,
);
