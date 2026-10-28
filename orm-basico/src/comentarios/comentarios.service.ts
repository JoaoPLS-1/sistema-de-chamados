import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PessoasService } from '../pessoas/pessoas.service.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';

@Injectable()
export class ComentariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pessoas: PessoasService,
  ) {}

  async criar(chamadoId: number, dto: CriarComentarioDto) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Mesma ordem de bloqueios da designação: chamado, depois pessoa.
            // Serializa comentários com encerramento e troca de responsável.
            await tx.$queryRaw`SELECT id FROM Chamado WHERE id = ${chamadoId} FOR UPDATE`;
            const chamado = await tx.chamado.findUnique({
              where: { id: chamadoId },
            });
            if (!chamado) throw new NotFoundException('Chamado não encontrado');
            if (
              chamado.situacao === 'FECHADO' ||
              chamado.situacao === 'CANCELADO'
            ) {
              throw new ConflictException(
                'Chamado encerrado não pode receber comentários',
              );
            }
            await tx.$queryRaw`SELECT id FROM Pessoa WHERE id = ${dto.autorId} FOR UPDATE`;
            await this.pessoas.buscarAtiva(dto.autorId, undefined, tx);
            if (
              dto.autorId !== chamado.solicitanteId &&
              dto.autorId !== chamado.tecnicoId
            ) {
              throw new ConflictException(
                'Apenas o solicitante e o técnico responsável podem comentar',
              );
            }
            await tx.pessoa.update({
              where: { id: dto.autorId },
              data: { temHistoricoChamados: true },
            });
            return tx.comentario.create({
              data: { chamadoId, autorId: dto.autorId, corpo: dto.corpo },
              include: { autor: { select: { id: true, nome: true } } },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 10000,
            timeout: 10000,
          },
        );
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
