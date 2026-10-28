import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LoginThrottleGuard } from './login-throttle.guard.js';
import { AuthService } from './auth.service.js';
import { DefinirSenhaDto, LoginDto } from './dto.js';
import { Publica, SomenteTecnicos, UsuarioAtual } from './auth.decorators.js';
import type {
  RequisicaoAutenticada,
  UsuarioAutenticado,
} from './auth.decorators.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publica()
  @UseGuards(LoginThrottleGuard)
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('auth/me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Post('auth/logout')
  @HttpCode(204)
  sair(@Req() req: RequisicaoAutenticada) {
    return this.auth.sair(req.tokenHash);
  }

  @SomenteTecnicos()
  @Put('pessoas/:id/senha')
  @HttpCode(204)
  definirSenha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DefinirSenhaDto,
  ) {
    return this.auth.definirSenha(id, dto.senha);
  }
}
