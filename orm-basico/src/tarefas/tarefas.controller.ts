import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AtualizarTarefaDto } from './dto/atualizar-tarefa.dto.js';
import { ZodPipe } from '../common/pipes/zod.pipe.js';
import { criarTarefaSchema } from './dto/criar-tarefa.schema.js';
import type { CriarTarefaDto } from './dto/criar-tarefa.schema.js';
import { TarefasService } from './tarefas.service.js';

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Post()
  criar(@Body(new ZodPipe(criarTarefaSchema)) dto: CriarTarefaDto) {
    return this.tarefasService.criar(dto);
  }

  @Get()
  listar(
    @Query('concluida', new ParseBoolPipe({ optional: true }))
    concluida?: boolean,
  ) {
    return this.tarefasService.listar(concluida);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.tarefasService.buscar(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarTarefaDto,
  ) {
    return this.tarefasService.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.tarefasService.remover(id);
  }
}
