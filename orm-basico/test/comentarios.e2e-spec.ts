import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthGuard, identidadeNegocio } from './identidade-negocio.js';

describe('Comentarios (e2e com MySQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let solicitanteId: number;
  let tecnicoId: number;
  let outroId: number;
  let chamadoId: number;
  let tipoId: number;
  const http = () => app.getHttpServer();
  const comentar = (body: Record<string, unknown>) =>
    request(http()).post(`/chamados/${chamadoId}/comentarios`).send(body);
  const designar = (id = tecnicoId) =>
    request(http())
      .patch(`/chamados/${chamadoId}/tecnico`)
      .send({ tecnicoId: id })
      .expect(200);
  const mudar = (situacao: string) =>
    request(http())
      .patch(`/chamados/${chamadoId}/situacao`)
      .send({ situacao })
      .expect(200);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthGuard)
      .useValue(identidadeNegocio)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    const criarPessoa = (tipo: 'SOLICITANTE' | 'TECNICO') =>
      prisma.pessoa.create({
        data: {
          nome: 'Teste comentarios',
          email: randomUUID() + '@example.com',
          tipo,
        },
      });
    solicitanteId = (await criarPessoa('SOLICITANTE')).id;
    tecnicoId = (await criarPessoa('TECNICO')).id;
    outroId = (await criarPessoa('TECNICO')).id;
    tipoId = (
      await prisma.tipoProblema.create({ data: { nome: randomUUID() } })
    ).id;
    const res = await request(http())
      .post('/chamados')
      .send({
        titulo: 'Falha de acesso',
        descricao: 'Nao consigo acessar o sistema',
        solicitanteId,
        tipoProblemaId: tipoId,
      })
      .expect(201);
    chamadoId = res.body.id;
  });
  afterEach(async () => {
    await prisma.comentario.deleteMany({ where: { chamadoId } });
    await prisma.chamado.delete({ where: { id: chamadoId } });
    await prisma.pessoa.deleteMany({
      where: { id: { in: [solicitanteId, tecnicoId, outroId] } },
    });
    await prisma.tipoProblema.delete({ where: { id: tipoId } });
  });
  afterAll(async () => {
    await app?.close();
  });

  it('registra conversa do solicitante e responsavel, ordenada e sem campos internos', async () => {
    const primeiro = await comentar({
      autorId: solicitanteId,
      corpo: '  Preciso de ajuda  ',
      id: 1,
      chamadoId: -1,
      criadoEm: '2000-01-01',
    }).expect(201);
    expect(primeiro.body).toMatchObject({
      chamadoId,
      autorId: solicitanteId,
      corpo: 'Preciso de ajuda',
      autor: { id: solicitanteId },
    });
    await designar();
    const segundo = await comentar({
      autorId: tecnicoId,
      corpo: 'Vou verificar',
    }).expect(201);
    // Empate de data tambem deve manter a ordem pelo ID.
    await prisma.comentario.updateMany({
      where: { chamadoId },
      data: { criadoEm: new Date('2026-01-01') },
    });
    const detalhe = await request(http())
      .get(`/chamados/${chamadoId}`)
      .expect(200);
    expect(detalhe.body.comentarios.map((c: { id: number }) => c.id)).toEqual([
      primeiro.body.id,
      segundo.body.id,
    ]);
    expect(detalhe.body.comentarios[0].autor).toEqual({
      id: solicitanteId,
      nome: 'Teste comentarios',
    });
    await request(http()).delete(`/pessoas/${tecnicoId}`).expect(409);
  });

  it('aceita comentario em resolvido, preserva conversa apos troca e impede antigo responsavel', async () => {
    await designar();
    const res = await comentar({
      autorId: tecnicoId,
      corpo: 'Atendimento inicial',
    }).expect(201);
    await mudar('RESOLVIDO');
    await comentar({
      autorId: solicitanteId,
      corpo: 'Problema persiste',
    }).expect(201);
    await designar(outroId);
    await comentar({
      autorId: tecnicoId,
      corpo: 'Nao sou mais responsavel',
    }).expect(409);
    await comentar({ autorId: outroId, corpo: 'Novo responsavel' }).expect(201);
    const detalhe = await request(http())
      .get(`/chamados/${chamadoId}`)
      .expect(200);
    expect(detalhe.body.comentarios[0].id).toBe(res.body.id);
    await request(http()).delete(`/pessoas/${tecnicoId}`).expect(409);
  });

  it('impede terceiros e tecnico ainda nao designado', async () => {
    await comentar({ autorId: tecnicoId, corpo: 'Teste' }).expect(409);
    await designar();
    await comentar({ autorId: outroId, corpo: 'Teste' }).expect(409);
    expect(await prisma.comentario.count({ where: { chamadoId } })).toBe(0);
  });

  it.each(['solicitante', 'tecnico'])(
    'impede autor %s inativo',
    async (autor) => {
      await designar();
      const autorId = autor === 'solicitante' ? solicitanteId : tecnicoId;
      await request(http())
        .patch(`/pessoas/${autorId}`)
        .send({ ativa: false })
        .expect(200);
      await comentar({ autorId, corpo: 'Teste' }).expect(409);
      expect(await prisma.comentario.count({ where: { chamadoId } })).toBe(0);
    },
  );

  it.each(['FECHADO', 'CANCELADO'])(
    'preserva conversa e impede comentario em %s',
    async (situacao) => {
      await comentar({
        autorId: solicitanteId,
        corpo: 'Antes do encerramento',
      }).expect(201);
      if (situacao === 'FECHADO') {
        await designar();
        await mudar('RESOLVIDO');
      }
      await mudar(situacao);
      await comentar({ autorId: solicitanteId, corpo: 'Depois' }).expect(409);
      const detalhe = await request(http())
        .get(`/chamados/${chamadoId}`)
        .expect(200);
      expect(detalhe.body.comentarios).toHaveLength(1);
    },
  );

  it.each([
    {},
    { corpo: null },
    { corpo: '' },
    { corpo: ' \n\t ' },
    { corpo: 1 },
    { corpo: false },
    { corpo: [] },
    { corpo: {} },
  ])('valida corpo e autor %j', async (extra) => {
    const body = Object.keys(extra).length
      ? { autorId: solicitanteId, corpo: 'Teste', ...extra }
      : {};
    await comentar(body).expect(400);
    expect(await prisma.comentario.count({ where: { chamadoId } })).toBe(0);
  });

  it('retorna 404 para autor ou chamado inexistente e 400 para parametro invalido', async () => {
    const inexistente = 2147483647;
    await comentar({ autorId: inexistente, corpo: 'Teste' }).expect(404);
    await request(http())
      .post(`/chamados/${inexistente}/comentarios`)
      .send({ autorId: solicitanteId, corpo: 'Teste' })
      .expect(404);
    await request(http())
      .post('/chamados/invalido/comentarios')
      .send({ autorId: solicitanteId, corpo: 'Teste' })
      .expect(400);
  });

  it('nao disponibiliza edicao nem exclusao e protege as chaves estrangeiras', async () => {
    const res = await comentar({
      autorId: solicitanteId,
      corpo: 'Historico original',
    }).expect(201);
    for (const url of [
      `/comentarios/${res.body.id}`,
      `/chamados/${chamadoId}/comentarios/${res.body.id}`,
    ]) {
      await request(http()).patch(url).send({ corpo: 'Alterado' }).expect(404);
      await request(http()).delete(url).expect(404);
    }
    await expect(
      prisma.chamado.delete({ where: { id: chamadoId } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(
      (
        await prisma.comentario.findUniqueOrThrow({
          where: { id: res.body.id },
        })
      ).corpo,
    ).toBe('Historico original');
  });

  it.each(['FECHADO', 'CANCELADO'])(
    'serializa comentario concorrente com %s',
    async (situacao) => {
      if (situacao === 'FECHADO') {
        await designar();
        await mudar('RESOLVIDO');
      }
      // Segura o encerramento no banco enquanto a requisicao de comentario inicia.
      let liberar!: () => void;
      let bloqueado!: () => void;
      const bloqueio = new Promise<void>((resolve) => {
        bloqueado = resolve;
      });
      const liberacao = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const encerrar = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM Chamado WHERE id = ${chamadoId} FOR UPDATE`;
        await tx.chamado.update({
          where: { id: chamadoId },
          data: { situacao: situacao as 'FECHADO' | 'CANCELADO' },
        });
        bloqueado();
        await liberacao;
      });
      await bloqueio;
      const comentario = comentar({
        autorId: solicitanteId,
        corpo: 'Concorrente',
      }).then((res) => res);
      liberar();
      await encerrar;
      expect((await comentario).status).toBe(409);
      expect(await prisma.comentario.count({ where: { chamadoId } })).toBe(0);
    },
  );
});
