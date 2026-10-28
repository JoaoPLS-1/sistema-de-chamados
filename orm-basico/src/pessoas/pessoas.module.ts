import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PessoasController } from './pessoas.controller.js';
import { PessoasService } from './pessoas.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PessoasController],
  providers: [PessoasService],
  exports: [PessoasService],
})
export class PessoasModule {}
