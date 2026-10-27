import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AtualizarTarefaDto } from './dto/atualizar-tarefa.dto.js';
import { CriarTarefaDto } from './dto/criar-tarefa.dto.js';
import { TarefasService } from './tarefas.service.js';

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Post()
  criar(@Body() dto: CriarTarefaDto) {
    return this.tarefasService.criar(dto);
  }

  @Get()
  listar() {
    return this.tarefasService.listar();
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
