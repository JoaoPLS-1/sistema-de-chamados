import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CriarTipoProblemaDto } from './dto/criar-tipo-problema.dto.js';
import { AtualizarTipoProblemaDto } from './dto/atualizar-tipo-problema.dto.js';

const camposPublicos = {
  id: true,
  nome: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} satisfies Prisma.TipoProblemaSelect;

@Injectable()
export class TiposProblemaService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarTipoProblemaDto) {
    try {
      return await this.prisma.tipoProblema.create({
        data: { nome: dto.nome, ativo: dto.ativo },
        select: camposPublicos,
      });
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  listar() {
    return this.prisma.tipoProblema.findMany({
      select: camposPublicos,
      orderBy: { id: 'asc' },
    });
  }

  async buscar(id: number) {
    const tipo = await this.prisma.tipoProblema.findUnique({
      where: { id },
      select: camposPublicos,
    });
    if (!tipo) throw new NotFoundException('Tipo de problema não encontrado');
    return tipo;
  }

  // O modulo de chamados deve executar a verificacao na transacao de abertura.
  async buscarAtivo(id: number) {
    const tipo = await this.buscar(id);
    if (!tipo.ativo) throw new ConflictException('Tipo de problema desativado');
    return tipo;
  }

  async atualizar(id: number, dto: AtualizarTipoProblemaDto) {
    try {
      return await this.prisma.tipoProblema.update({
        where: { id },
        data: { nome: dto.nome, ativo: dto.ativo },
        select: camposPublicos,
      });
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  async remover(id: number) {
    try {
      const resultado = await this.prisma.tipoProblema.deleteMany({
        where: { id, temHistoricoChamados: false },
      });
      if (resultado.count === 0) {
        await this.buscar(id);
        throw new ConflictException(
          'Tipo de problema com histórico de chamados deve ser desativado',
        );
      }
    } catch (erro) {
      this.tratarErro(erro);
    }
  }

  private tratarErro(erro: unknown): never {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2002')
        throw new ConflictException('Nome de tipo de problema já cadastrado');
      if (erro.code === 'P2025')
        throw new NotFoundException('Tipo de problema não encontrado');
      if (erro.code === 'P2003')
        throw new ConflictException(
          'Tipo de problema com histórico de chamados deve ser desativado',
        );
    }
    throw erro;
  }
}
