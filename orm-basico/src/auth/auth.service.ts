import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { conferirSenha, gerarHashSenha, hashToken } from './senhas.js';
import type { LoginDto } from './dto.js';

@Injectable()
export class AuthService {
  // Hash valido para executar scrypt mesmo quando a conta nao existe.
  private readonly hashFicticio = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;

  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const pessoa = await this.prisma.pessoa.findUnique({
      where: { email: dto.email },
      include: { credencial: true },
    });
    const senhaValida = await conferirSenha(
      dto.senha,
      pessoa?.credencial?.senhaHash ?? this.hashFicticio,
    );
    if (!pessoa?.ativa || !pessoa.credencial || !senhaValida)
      throw new UnauthorizedException('E-mail ou senha inválidos');
    const token = randomBytes(32).toString('base64url');
    const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000);
    // Serializa com redefinicao de senha para nao criar sessao usando credencial antiga.
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Pessoa WHERE id = ${pessoa.id} FOR UPDATE`;
        const atual = await tx.pessoa.findUnique({
          where: { id: pessoa.id },
          include: { credencial: true },
        });
        if (
          !atual?.ativa ||
          atual.credencial?.senhaHash !== pessoa.credencial?.senhaHash
        )
          throw new UnauthorizedException('E-mail ou senha inválidos');
        await tx.sessao.create({
          data: { tokenHash: hashToken(token), pessoaId: pessoa.id, expiraEm },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return {
      token,
      tipo: 'Bearer',
      expiraEm,
      pessoa: {
        id: pessoa.id,
        nome: pessoa.nome,
        email: pessoa.email,
        tipo: pessoa.tipo,
      },
    };
  }

  async autenticar(token: string) {
    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { pessoa: true },
    });
    if (!sessao || sessao.expiraEm <= new Date() || !sessao.pessoa.ativa)
      throw new UnauthorizedException('Sessão inválida ou expirada');
    const { id, nome, email, tipo } = sessao.pessoa;
    return { id, nome, email, tipo };
  }

  async sair(tokenHash: string) {
    await this.prisma.sessao.deleteMany({ where: { tokenHash } });
  }

  async definirSenha(pessoaId: number, senha: string) {
    const senhaHash = await gerarHashSenha(senha);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Pessoa WHERE id = ${pessoaId} FOR UPDATE`;
      if (!(await tx.pessoa.findUnique({ where: { id: pessoaId } })))
        throw new NotFoundException('Pessoa não encontrada');
      await tx.credencial.upsert({
        where: { pessoaId },
        create: { pessoaId, senhaHash },
        update: { senhaHash },
      });
      await tx.sessao.deleteMany({ where: { pessoaId } });
    });
  }
}
