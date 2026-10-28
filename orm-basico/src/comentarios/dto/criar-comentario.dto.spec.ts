import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarComentarioDto } from './criar-comentario.dto.js';

describe('CriarComentarioDto', () => {
  it('normaliza corpo e descarta campos controlados pelo servidor', async () => {
    const dto = plainToInstance(CriarComentarioDto, {
      autorId: 1,
      corpo: '  Texto com\nquebra de linha  ',
      chamadoId: 99,
      criadoEm: '2000-01-01',
    });
    expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    expect(dto).toEqual({ autorId: 1, corpo: 'Texto com\nquebra de linha' });
  });

  it.each([undefined, null, '', ' \n\t ', 1, false, [], {}])(
    'recusa corpo %j',
    async (corpo) => {
      const dto = plainToInstance(CriarComentarioDto, { autorId: 1, corpo });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it.each([undefined, null, '1', 0, -1, 1.5, true, [], {}])(
    'recusa autor %j',
    async (autorId) => {
      const dto = plainToInstance(CriarComentarioDto, {
        autorId,
        corpo: 'Mensagem',
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});
