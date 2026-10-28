import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TiposProblemaService } from './tipos-problema.service.js';
import { CriarTipoProblemaDto } from './dto/criar-tipo-problema.dto.js';
import { AtualizarTipoProblemaDto } from './dto/atualizar-tipo-problema.dto.js';

@Controller('tipos-problema')
export class TiposProblemaController {
  constructor(private readonly tiposProblemaService: TiposProblemaService) {}

  @Post()
  criar(@Body() dto: CriarTipoProblemaDto) {
    return this.tiposProblemaService.criar(dto);
  }

  @Get()
  listar() {
    return this.tiposProblemaService.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposProblemaService.buscar(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarTipoProblemaDto,
  ) {
    return this.tiposProblemaService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.tiposProblemaService.remover(id);
  }
}
