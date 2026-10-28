import { ConflictException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PessoasService } from '../pessoas/pessoas.service.js';
import { ComentariosService } from './comentarios.service.js';

describe('ComentariosService', () => {
  function preparar(situacao = 'ABERTO') {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
      chamado: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          solicitanteId: 2,
          tecnicoId: 3,
          situacao,
        }),
      },
      pessoa: { update: vi.fn().mockResolvedValue({}) },
      comentario: { create: vi.fn().mockResolvedValue({ id: 10 }) },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((operacao) => operacao(tx)),
    };
    const pessoas = { buscarAtiva: vi.fn().mockResolvedValue({ id: 2 }) };
    const service = new ComentariosService(
      prisma as unknown as PrismaService,
      pessoas as unknown as PessoasService,
    );
    return { service, tx, prisma, pessoas };
  }

  it.each([2, 3])(
    'aceita participante %s e marca historico na transacao',
    async (autorId) => {
      const { service, tx, pessoas } = preparar();
      await expect(
        service.criar(1, { autorId, corpo: 'Mensagem' }),
      ).resolves.toEqual({ id: 10 });
      expect(pessoas.buscarAtiva).toHaveBeenCalledWith(autorId, undefined, tx);
      expect(tx.pessoa.update).toHaveBeenCalledWith({
        where: { id: autorId },
        data: { temHistoricoChamados: true },
      });
      expect(tx.comentario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { chamadoId: 1, autorId, corpo: 'Mensagem' },
        }),
      );
    },
  );

  it.each(['FECHADO', 'CANCELADO'])(
    'recusa %s antes de escrever',
    async (situacao) => {
      const { service, tx } = preparar(situacao);
      await expect(
        service.criar(1, { autorId: 2, corpo: 'Mensagem' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.pessoa.update).not.toHaveBeenCalled();
      expect(tx.comentario.create).not.toHaveBeenCalled();
    },
  );

  it('recusa terceiro sem registrar historico ou comentario', async () => {
    const { service, tx } = preparar();
    await expect(
      service.criar(1, { autorId: 4, corpo: 'Mensagem' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.pessoa.update).not.toHaveBeenCalled();
    expect(tx.comentario.create).not.toHaveBeenCalled();
  });

  it('recusa pessoa inativa sem escrever', async () => {
    const { service, tx, pessoas } = preparar();
    pessoas.buscarAtiva.mockRejectedValue(
      new ConflictException('Pessoa inativa'),
    );
    await expect(
      service.criar(1, { autorId: 2, corpo: 'Mensagem' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.comentario.create).not.toHaveBeenCalled();
  });

  it('retorna 404 se chamado nao existe', async () => {
    const { service, tx } = preparar();
    tx.chamado.findUnique.mockResolvedValue(null);
    await expect(
      service.criar(1, { autorId: 2, corpo: 'Mensagem' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.comentario.create).not.toHaveBeenCalled();
  });

  const conflito = () =>
    new Prisma.PrismaClientKnownRequestError('Conflito', {
      code: 'P2034',
      clientVersion: 'test',
    });

  it('repete transacao apos conflito e conclui', async () => {
    const { service, prisma } = preparar();
    prisma.$transaction.mockRejectedValueOnce(conflito());
    await expect(
      service.criar(1, { autorId: 2, corpo: 'Mensagem' }),
    ).resolves.toEqual({ id: 10 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('limita repeticoes a tres tentativas e retorna 409', async () => {
    const { service, prisma } = preparar();
    prisma.$transaction.mockRejectedValue(conflito());
    await expect(
      service.criar(1, { autorId: 2, corpo: 'Mensagem' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
