import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TiposProblemaController } from './tipos-problema.controller.js';
import { TiposProblemaService } from './tipos-problema.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [TiposProblemaController],
  providers: [TiposProblemaService],
  exports: [TiposProblemaService],
})
export class TiposProblemaModule {}
