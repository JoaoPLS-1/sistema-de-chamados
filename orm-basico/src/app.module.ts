import { PessoasModule } from './pessoas/pessoas.module.js';
import { TiposProblemaModule } from './tipos-problema/tipos-problema.module.js';
import { ChamadosModule } from './chamados/chamados.module.js';
import { ComentariosModule } from './comentarios/comentarios.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TarefasModule } from './tarefas/tarefas.module.js';

@Module({
  imports: [
    PrismaModule,
    TarefasModule,
    PessoasModule,
    TiposProblemaModule,
    ChamadosModule,
    ComentariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
