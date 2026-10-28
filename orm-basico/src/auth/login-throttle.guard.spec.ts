import { HttpException, type ExecutionContext } from '@nestjs/common';
import { vi } from 'vitest';
import { LoginThrottleGuard } from './login-throttle.guard.js';

describe('Limite de login', () => {
  afterEach(() => vi.restoreAllMocks());
  const contexto = (ip: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ ip }) }),
    }) as ExecutionContext;
  it('limita tentativas por IP e libera apos a janela', () => {
    const agora = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const guard = new LoginThrottleGuard();
    for (let i = 0; i < 30; i++)
      expect(guard.canActivate(contexto('127.0.0.1'))).toBe(true);
    expect(() => guard.canActivate(contexto('127.0.0.1'))).toThrow(
      HttpException,
    );
    expect(guard.canActivate(contexto('127.0.0.2'))).toBe(true);
    agora.mockReturnValue(61001);
    expect(guard.canActivate(contexto('127.0.0.1'))).toBe(true);
  });
});
