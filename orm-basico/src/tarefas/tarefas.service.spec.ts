import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { TarefasService } from './tarefas.service.js';

describe('TarefasService', () => {
  const tarefa = {
    id: 1,
    titulo: 'Estudar NestJS',
    concluida: true,
    criadaEm: new Date('2026-10-27T12:00:00Z'),
  };
  let service: TarefasService;
  let prisma: {
    tarefa: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      tarefa: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        TarefasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(TarefasService);
  });

  it('retorna a tarefa encontrada', async () => {
    prisma.tarefa.findUnique.mockResolvedValue(tarefa);

    await expect(service.buscar(1)).resolves.toEqual(tarefa);
    expect(prisma.tarefa.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it.each(['buscar', 'atualizar', 'remover'] as const)(
    '%s rejeita tarefa inexistente sem executar alteracoes',
    async (operacao) => {
      prisma.tarefa.findUnique.mockResolvedValue(null);

      const resultado = operacao === 'atualizar'
        ? service.atualizar(99, { concluida: true })
        : service[operacao](99);

      await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
      await expect(resultado).rejects.toMatchObject({
        message: 'Tarefa 99 não encontrada',
      });
      expect(prisma.tarefa.update).not.toHaveBeenCalled();
      expect(prisma.tarefa.delete).not.toHaveBeenCalled();
    },
  );

  it('permite reabrir uma tarefa sem alterar o titulo', async () => {
    prisma.tarefa.findUnique.mockResolvedValue(tarefa);
    prisma.tarefa.update.mockResolvedValue({ ...tarefa, concluida: false });

    await expect(service.atualizar(1, { concluida: false })).resolves.toEqual({
      ...tarefa,
      concluida: false,
    });
    expect(prisma.tarefa.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { concluida: false },
    });
  });
});
