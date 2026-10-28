import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt);

export async function gerarHashSenha(senha: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await derivar(senha, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function conferirSenha(senha: string, armazenado: string) {
  const [algoritmo, salt, hex] = armazenado.split(':');
  if (algoritmo !== 'scrypt' || !salt || !hex || !/^[a-f0-9]{128}$/.test(hex))
    return false;
  const hash = (await derivar(senha, salt, 64)) as Buffer;
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
