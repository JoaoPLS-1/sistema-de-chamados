import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from './zod.pipe.js';
import { criarTarefaSchema } from '../../tarefas/dto/criar-tarefa.schema.js';

describe('ZodPipe', () => {
  it('retorna os dados tratados pelo schema', () => {
    const pipe = new ZodPipe(z.string().transform((value) => value.length));
    expect(pipe.transform('Nest')).toBe(4);
  });

  it('descarta campos desconhecidos antes de entregar os dados ao service', () => {
    const pipe = new ZodPipe(criarTarefaSchema);
    expect(
      pipe.transform({ titulo: 'Estudar Zod', id: 99, concluida: true }),
    ).toEqual({ titulo: 'Estudar Zod' });
  });

  it('preserva descricao opcional e aceita null para remove-la', () => {
    const pipe = new ZodPipe(criarTarefaSchema);
    for (const descricao of ['Detalhes', '', null]) {
      expect(pipe.transform({ titulo: 'Estudar Zod', descricao })).toEqual({
        titulo: 'Estudar Zod',
        descricao,
      });
    }
    expect(() =>
      pipe.transform({ titulo: 'Estudar Zod', descricao: 123 }),
    ).toThrow(BadRequestException);
  });

  it('responde com erro 400 e detalhes do campo invalido', () => {
    const pipe = new ZodPipe(criarTarefaSchema);
    let erro: unknown;
    try {
      pipe.transform({ titulo: '' });
    } catch (value) {
      erro = value;
    }
    expect(erro).toBeInstanceOf(BadRequestException);
    const resposta = erro as BadRequestException;
    expect(resposta.getStatus()).toBe(400);
    expect(resposta.getResponse()).toMatchObject({
      message: [
        expect.objectContaining({
          path: ['titulo'],
          code: 'too_small',
          message: 'O título é obrigatório',
        }),
      ],
    });
  });
});
