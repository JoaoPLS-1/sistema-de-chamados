import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { TipoPessoa } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CriarPessoaDto } from './dto/criar-pessoa.dto.js';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto.js';

const camposPublicos = {
  id: true,
  nome: true,
  email: true,
  tipo: true,
  ativa: true,
  criadaEm: true,
  atualizadaEm: true,
} satisfies Prisma.PessoaSelect;

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarPessoaDto) {
    try {
      return await this.prisma.pessoa.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          tipo: dto.tipo,
          ativa: dto.ativa,
        },
        select: camposPublicos,
      });
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  listar() {
    return this.prisma.pessoa.findMany({
      select: camposPublicos,
      orderBy: { id: 'asc' },
    });
  }

  async buscar(id: number, tx: Prisma.TransactionClient = this.prisma) {
    const pessoa = await tx.pessoa.findUnique({
      where: { id },
      select: camposPublicos,
    });
    if (!pessoa) throw new NotFoundException('Pessoa não encontrada');
    return pessoa;
  }

  // Reutilizado pelos proximos modulos antes de abrir, designar ou comentar.
  async buscarAtiva(
    id: number,
    tipo?: TipoPessoa,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const pessoa = await this.buscar(id, tx);
    if (!pessoa.ativa) throw new ConflictException('Pessoa inativa');
    if (tipo !== undefined && pessoa.tipo !== tipo) {
      throw new ConflictException('Tipo de pessoa incompatível com a operação');
    }
    return pessoa;
  }

  async atualizar(id: number, dto: AtualizarPessoaDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const pessoa = await tx.pessoa.update({
          where: { id },
          data: {
            nome: dto.nome,
            email: dto.email,
            tipo: dto.tipo,
            ativa: dto.ativa,
          },
          select: camposPublicos,
        });
        if (dto.ativa === false)
          await tx.sessao.deleteMany({ where: { pessoaId: id } });
        return pessoa;
      });
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  async remover(id: number) {
    try {
      // O criterio e verificado no DELETE para proteger o historico atomicamente.
      const resultado = await this.prisma.pessoa.deleteMany({
        where: { id, temHistoricoChamados: false },
      });
      if (resultado.count === 0) {
        await this.buscar(id);
        throw new ConflictException(
          'Pessoa com histórico de chamados deve ser desativada',
        );
      }
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  private tratarErro(erro: unknown): never {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2002')
        throw new ConflictException('E-mail já cadastrado');
      if (erro.code === 'P2025')
        throw new NotFoundException('Pessoa não encontrada');
      if (erro.code === 'P2003')
        throw new ConflictException(
          'Pessoa com histórico de chamados deve ser desativada',
        );
    }
    throw erro;
  }
}
