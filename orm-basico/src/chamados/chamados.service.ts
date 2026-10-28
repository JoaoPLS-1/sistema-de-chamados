import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Chamado } from '../generated/prisma/client.js';
import { SituacaoChamado, TipoPessoa } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PessoasService } from '../pessoas/pessoas.service.js';
import { TiposProblemaService } from '../tipos-problema/tipos-problema.service.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { FiltrarChamadosDto } from './dto/filtrar-chamados.dto.js';

const pessoaResumo = {
  id: true,
  nome: true,
  email: true,
  tipo: true,
  ativa: true,
};
const detalhes = {
  solicitante: { select: pessoaResumo },
  tecnico: { select: pessoaResumo },
  tipoProblema: { select: { id: true, nome: true, ativo: true } },
} satisfies Prisma.ChamadoInclude;

const transicoes: Record<SituacaoChamado, SituacaoChamado[]> = {
  ABERTO: ['EM_ATENDIMENTO', 'CANCELADO'],
  EM_ATENDIMENTO: ['RESOLVIDO', 'CANCELADO'],
  RESOLVIDO: ['EM_ATENDIMENTO', 'FECHADO'],
  FECHADO: [],
  CANCELADO: [],
};

@Injectable()
export class ChamadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pessoas: PessoasService,
    private readonly tiposProblema: TiposProblemaService,
  ) {}

  criar(dto: CriarChamadoDto) {
    return this.transacionar(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Pessoa WHERE id = ${dto.solicitanteId} FOR UPDATE`;
      await this.pessoas.buscarAtiva(
        dto.solicitanteId,
        TipoPessoa.SOLICITANTE,
        tx,
      );
      await tx.$queryRaw`SELECT id FROM TipoProblema WHERE id = ${dto.tipoProblemaId} FOR UPDATE`;
      await this.tiposProblema.buscarAtivo(dto.tipoProblemaId, tx);
      await tx.pessoa.update({
        where: { id: dto.solicitanteId },
        data: { temHistoricoChamados: true },
      });
      await tx.tipoProblema.update({
        where: { id: dto.tipoProblemaId },
        data: { temHistoricoChamados: true },
      });
      return tx.chamado.create({
        data: {
          titulo: dto.titulo,
          descricao: dto.descricao,
          prioridade: dto.prioridade,
          solicitanteId: dto.solicitanteId,
          tipoProblemaId: dto.tipoProblemaId,
          situacao: SituacaoChamado.ABERTO,
          tecnicoId: null,
        },
        include: detalhes,
      });
    });
  }

  listar(filtros: FiltrarChamadosDto = {}) {
    return this.prisma.chamado.findMany({
      where: {
        situacao: filtros.situacao,
        prioridade: filtros.prioridade,
        tipoProblemaId: filtros.tipoProblemaId,
        tecnicoId: filtros.tecnicoId,
      },
      include: detalhes,
      orderBy: { id: 'asc' },
    });
  }

  async buscar(id: number) {
    const chamado = await this.prisma.chamado.findUnique({
      where: { id },
      include: detalhes,
    });
    if (!chamado) throw new NotFoundException('Chamado não encontrado');
    return chamado;
  }

  atualizar(id: number, dto: AtualizarChamadoDto) {
    return this.transacionar(async (tx) => {
      const chamado = await this.buscarBloqueado(tx, id);
      this.verificarAbertoParaAlteracoes(chamado);
      return tx.chamado.update({
        where: { id },
        data: {
          titulo: dto.titulo,
          descricao: dto.descricao,
          prioridade: dto.prioridade,
        },
        include: detalhes,
      });
    });
  }

  designarTecnico(id: number, tecnicoId: number) {
    return this.transacionar(async (tx) => {
      const chamado = await this.buscarBloqueado(tx, id);
      this.verificarAbertoParaAlteracoes(chamado);
      const iniciaAtendimento = chamado.situacao === SituacaoChamado.ABERTO;
      const ocupaVaga =
        iniciaAtendimento ||
        chamado.situacao === SituacaoChamado.EM_ATENDIMENTO;
      await this.verificarTecnico(tx, chamado, tecnicoId, ocupaVaga);
      await tx.pessoa.update({
        where: { id: tecnicoId },
        data: { temHistoricoChamados: true },
      });
      return tx.chamado.update({
        where: { id },
        data: {
          tecnicoId,
          situacao: iniciaAtendimento
            ? SituacaoChamado.EM_ATENDIMENTO
            : chamado.situacao,
        },
        include: detalhes,
      });
    });
  }

  alterarSituacao(id: number, situacao: SituacaoChamado) {
    return this.transacionar(async (tx) => {
      const chamado = await this.buscarBloqueado(tx, id);
      this.verificarAbertoParaAlteracoes(chamado);
      if (!transicoes[chamado.situacao].includes(situacao)) {
        throw new ConflictException('Transição de situação proibida');
      }
      if (situacao === SituacaoChamado.EM_ATENDIMENTO) {
        if (chamado.tecnicoId === null)
          throw new ConflictException(
            'Designe um técnico antes de iniciar o atendimento',
          );
        await this.verificarTecnico(tx, chamado, chamado.tecnicoId, true);
      }
      return tx.chamado.update({
        where: { id },
        data: {
          situacao,
          resolvidoEm:
            situacao === SituacaoChamado.RESOLVIDO ? new Date() : undefined,
        },
        include: detalhes,
      });
    });
  }

  private async buscarBloqueado(tx: Prisma.TransactionClient, id: number) {
    await tx.$queryRaw`SELECT id FROM Chamado WHERE id = ${id} FOR UPDATE`;
    const chamado = await tx.chamado.findUnique({ where: { id } });
    if (!chamado) throw new NotFoundException('Chamado não encontrado');
    return chamado;
  }

  private verificarAbertoParaAlteracoes(chamado: Chamado) {
    if (
      chamado.situacao === SituacaoChamado.FECHADO ||
      chamado.situacao === SituacaoChamado.CANCELADO
    ) {
      throw new ConflictException('Chamado encerrado não pode ser alterado');
    }
  }

  private async verificarTecnico(
    tx: Prisma.TransactionClient,
    chamado: Chamado,
    tecnicoId: number,
    ocupaVaga: boolean,
  ) {
    if (chamado.solicitanteId === tecnicoId)
      throw new ConflictException('Ninguém pode atender o próprio chamado');
    // Todas as operações que ocupam uma vaga bloqueiam a mesma linha do técnico.
    // ReadCommitted faz a contagem enxergar atribuições confirmadas após a espera.
    await tx.$queryRaw`SELECT id FROM Pessoa WHERE id = ${tecnicoId} FOR UPDATE`;
    await this.pessoas.buscarAtiva(tecnicoId, TipoPessoa.TECNICO, tx);
    if (ocupaVaga) {
      const emAtendimento = await tx.chamado.count({
        where: {
          tecnicoId,
          situacao: SituacaoChamado.EM_ATENDIMENTO,
          id: { not: chamado.id },
        },
      });
      if (emAtendimento >= 5)
        throw new ConflictException(
          'Técnico já possui 5 chamados em atendimento',
        );
    }
  }

  private async transacionar<T>(
    operacao: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(operacao, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 10000,
          timeout: 10000,
        });
      } catch (erro) {
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          erro.code === 'P2034'
        ) {
          if (tentativa < 2) continue;
          throw new ConflictException(
            'Conflito entre operações simultâneas; tente novamente',
          );
        }
        throw erro;
      }
    }
    throw new ConflictException('Não foi possível concluir a operação');
  }
}
