import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ComentariosService } from './comentarios.service.js';
import { CorpoComentarioDto } from './dto/criar-comentario.dto.js';
import { UsuarioAtual } from '../auth/auth.decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.decorators.js';

@Controller('chamados/:chamadoId/comentarios')
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  @Post()
  criar(
    @Param('chamadoId', ParseIntPipe) chamadoId: number,
    @Body() dto: CorpoComentarioDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.comentarios.criar(chamadoId, { ...dto, autorId: usuario.id });
  }
}
