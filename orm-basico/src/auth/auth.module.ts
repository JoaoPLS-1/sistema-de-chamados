import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { LoginThrottleGuard } from './login-throttle.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    LoginThrottleGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
