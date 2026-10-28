import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChamadosService } from './chamados.service.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { FiltrarChamadosDto } from './dto/filtrar-chamados.dto.js';
import { DesignarTecnicoDto } from './dto/designar-tecnico.dto.js';
import { AlterarSituacaoDto } from './dto/alterar-situacao.dto.js';

@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  @Post()
  criar(@Body() dto: CriarChamadoDto) {
    return this.chamadosService.criar(dto);
  }

  @Get()
  listar(@Query() filtros: FiltrarChamadosDto) {
    return this.chamadosService.listar(filtros);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.chamadosService.buscar(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChamadoDto,
  ) {
    return this.chamadosService.atualizar(id, dto);
  }

  @Patch(':id/tecnico')
  designarTecnico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DesignarTecnicoDto,
  ) {
    return this.chamadosService.designarTecnico(id, dto.tecnicoId);
  }

  @Patch(':id/situacao')
  alterarSituacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarSituacaoDto,
  ) {
    return this.chamadosService.alterarSituacao(id, dto.situacao);
  }
}
