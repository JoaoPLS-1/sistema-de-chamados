import { z } from 'zod';

export const criarTarefaSchema = z.object({
  titulo: z
    .string({ error: 'O título deve ser um texto' })
    .min(1, 'O título é obrigatório')
    .max(191, 'O título deve ter no máximo 191 caracteres'),
});

export type CriarTarefaDto = z.infer<typeof criarTarefaSchema>;
