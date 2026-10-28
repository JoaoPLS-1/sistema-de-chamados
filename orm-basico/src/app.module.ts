import { PessoasModule } from './pessoas/pessoas.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TarefasModule } from './tarefas/tarefas.module.js';

@Module({
  imports: [PrismaModule, TarefasModule, PessoasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
