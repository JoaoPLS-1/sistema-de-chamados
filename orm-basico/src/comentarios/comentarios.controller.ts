import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ComentariosService } from './comentarios.service.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';

@Controller('chamados/:chamadoId/comentarios')
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  @Post()
  criar(
    @Param('chamadoId', ParseIntPipe) chamadoId: number,
    @Body() dto: CriarComentarioDto,
  ) {
    return this.comentarios.criar(chamadoId, dto);
  }
}
