import { conferirSenha, gerarHashSenha, hashToken } from './senhas.js';

describe('Senhas e tokens', () => {
  it('usa salt aleatorio e confere senha sem remover espacos', async () => {
    const senha = ' Uma senha forte! ';
    const primeiro = await gerarHashSenha(senha);
    expect(primeiro).not.toBe(await gerarHashSenha(senha));
    expect(primeiro).not.toContain(senha);
    expect(await conferirSenha(senha, primeiro)).toBe(true);
    expect(await conferirSenha(senha.trim(), primeiro)).toBe(false);
    expect(await conferirSenha('Incorreta', primeiro)).toBe(false);
  });
  it.each(['', 'scrypt:a:invalido', 'outro:a:' + '0'.repeat(128)])(
    'recusa hash malformado %s',
    async (hash) => {
      expect(await conferirSenha('senha', hash)).toBe(false);
    },
  );
  it('armazena somente resumo SHA-256 do token', () => {
    expect(hashToken('token')).toHaveLength(64);
    expect(hashToken('token')).toBe(hashToken('token'));
    expect(hashToken('outro')).not.toBe(hashToken('token'));
  });
});
