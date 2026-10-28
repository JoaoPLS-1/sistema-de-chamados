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
import { DadosChamadoDto } from './dto/criar-chamado.dto.js';
import { SomenteTecnicos, UsuarioAtual } from '../auth/auth.decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.decorators.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { FiltrarChamadosDto } from './dto/filtrar-chamados.dto.js';
import { DesignarTecnicoDto } from './dto/designar-tecnico.dto.js';
import { AlterarSituacaoDto } from './dto/alterar-situacao.dto.js';

@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  @Post()
  criar(
    @Body() dto: DadosChamadoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.chamadosService.criar({ ...dto, solicitanteId: usuario.id });
  }

  @Get()
  listar(
    @Query() filtros: FiltrarChamadosDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.chamadosService.listar(
      filtros,
      usuario.tipo === 'SOLICITANTE' ? usuario.id : undefined,
    );
  }

  @Get(':id')
  buscar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.chamadosService.buscar(
      id,
      usuario.tipo === 'SOLICITANTE' ? usuario.id : undefined,
    );
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChamadoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.chamadosService.atualizar(
      id,
      dto,
      usuario.tipo === 'SOLICITANTE' ? usuario.id : undefined,
    );
  }

  @Patch(':id/tecnico')
  @SomenteTecnicos()
  designarTecnico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DesignarTecnicoDto,
  ) {
    return this.chamadosService.designarTecnico(id, dto.tecnicoId);
  }

  @Patch(':id/situacao')
  @SomenteTecnicos()
  alterarSituacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarSituacaoDto,
  ) {
    return this.chamadosService.alterarSituacao(id, dto.situacao);
  }
}
