import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarTarefaDto } from './dto/atualizar-tarefa.dto.js';
import type { CriarTarefaDto } from './dto/criar-tarefa.schema.js';

@Injectable()
export class TarefasService {
  constructor(private readonly prisma: PrismaService) {}

  criar(dto: CriarTarefaDto) {
    return this.prisma.tarefa.create({ data: { titulo: dto.titulo } });
  }

  listar(concluida?: boolean) {
    return this.prisma.tarefa.findMany({
      where: concluida === undefined ? {} : { concluida },
      orderBy: { id: 'asc' },
    });
  }

  async buscar(id: number) {
    const tarefa = await this.prisma.tarefa.findUnique({ where: { id } });
    if (!tarefa) throw new NotFoundException(`Tarefa ${id} não encontrada`);
    return tarefa;
  }

  async atualizar(id: number, dto: AtualizarTarefaDto) {
    await this.buscar(id);
    return this.prisma.tarefa.update({ where: { id }, data: dto });
  }

  async remover(id: number) {
    await this.buscar(id);
    return this.prisma.tarefa.delete({ where: { id } });
  }
}
