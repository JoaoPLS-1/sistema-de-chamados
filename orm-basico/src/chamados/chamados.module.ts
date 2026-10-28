import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PessoasModule } from '../pessoas/pessoas.module.js';
import { TiposProblemaModule } from '../tipos-problema/tipos-problema.module.js';
import { ChamadosController } from './chamados.controller.js';
import { ChamadosService } from './chamados.service.js';

@Module({
  imports: [PrismaModule, PessoasModule, TiposProblemaModule],
  controllers: [ChamadosController],
  providers: [ChamadosService],
  exports: [ChamadosService],
})
export class ChamadosModule {}
