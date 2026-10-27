import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Tarefas (e2e com MySQL)', () => {
  let app: INestApplication<App>;
  let tarefaId: number | undefined;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    if (tarefaId !== undefined) {
      await app.get(PrismaService).tarefa.deleteMany({
        where: { id: tarefaId },
      });
      tarefaId = undefined;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('executa o CRUD e retorna 404 apos a remocao', async () => {
    const http = app.getHttpServer();
    const titulo = `Teste e2e ${Date.now()}`;
    const criada = await request(http)
      .post('/tarefas')
      .send({ titulo })
      .expect(201);
    tarefaId = criada.body.id;
    expect(tarefaId).toEqual(expect.any(Number));
    expect(criada.body).toMatchObject({ titulo, concluida: false });
    expect(Number.isNaN(Date.parse(criada.body.criadaEm))).toBe(false);

    await request(http)
      .get(`/tarefas/${tarefaId}`)
      .expect(200)
      .expect(criada.body);

    const lista = await request(http).get('/tarefas').expect(200);
    expect(lista.body).toEqual(expect.arrayContaining([criada.body]));
    const ids = lista.body.map((tarefa: { id: number }) => tarefa.id);
    expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));

    const atualizada = await request(http)
      .patch(`/tarefas/${tarefaId}`)
      .send({ titulo: `${titulo} atualizado`, concluida: true })
      .expect(200);
    expect(atualizada.body).toMatchObject({
      id: tarefaId,
      titulo: `${titulo} atualizado`,
      concluida: true,
    });

    const reaberta = await request(http)
      .patch(`/tarefas/${tarefaId}`)
      .send({ concluida: false })
      .expect(200);
    expect(reaberta.body).toMatchObject({
      titulo: `${titulo} atualizado`,
      concluida: false,
    });
    await request(http)
      .get(`/tarefas/${tarefaId}`)
      .expect(200)
      .expect(reaberta.body);

    await request(http)
      .delete(`/tarefas/${tarefaId}`)
      .expect(200)
      .expect(reaberta.body);
    await request(http).get(`/tarefas/${tarefaId}`).expect(404);
    await request(http)
      .patch(`/tarefas/${tarefaId}`)
      .send({ concluida: true })
      .expect(404);
    await request(http).delete(`/tarefas/${tarefaId}`).expect(404);
  });

  it('filtra tarefas pendentes e concluidas e lista todas sem filtro', async () => {
    const http = app.getHttpServer();
    const criada = await request(http)
      .post('/tarefas')
      .send({ titulo: 'Teste de filtro' })
      .expect(201);
    tarefaId = criada.body.id;
    for (const concluida of [false, true]) {
      await request(http)
        .patch('/tarefas/' + tarefaId)
        .send({ concluida })
        .expect(200);
      const filtrada = await request(http)
        .get('/tarefas?concluida=' + concluida)
        .expect(200);
      expect(filtrada.body.some((t: { id: number }) => t.id === tarefaId)).toBe(
        true,
      );
      expect(
        filtrada.body.every(
          (t: { concluida: boolean }) => t.concluida === concluida,
        ),
      ).toBe(true);
      const oposta = await request(http)
        .get('/tarefas?concluida=' + !concluida)
        .expect(200);
      expect(oposta.body.some((t: { id: number }) => t.id === tarefaId)).toBe(
        false,
      );
      const todas = await request(http).get('/tarefas').expect(200);
      expect(todas.body.some((t: { id: number }) => t.id === tarefaId)).toBe(
        true,
      );
    }
  });

  it('rejeita filtros booleanos invalidos', async () => {
    for (const valor of ['sim', '1', 'TRUE', '']) {
      await request(app.getHttpServer())
        .get('/tarefas?concluida=' + valor)
        .expect(400);
    }
  });

  it.each([undefined, null, '', 123, true, [], {}, 'a'.repeat(192)])(
    'rejeita titulo invalido na criacao: %j',
    async (titulo) => {
      const resposta = await request(app.getHttpServer())
        .post('/tarefas')
        .send({ titulo })
        .expect(400);
      if (titulo === '') {
        expect(resposta.body.message).toContain('O título é obrigatório');
      }
    },
  );

  it('aceita 191 caracteres, descarta campos extras e valida atualizacoes parciais', async () => {
    const http = app.getHttpServer();
    const titulo = 'a'.repeat(191);
    const criada = await request(http)
      .post('/tarefas')
      .send({ titulo, id: -1, concluida: true, extra: 'ignorar' })
      .expect(201);
    tarefaId = criada.body.id;
    expect(criada.body).toMatchObject({ titulo, concluida: false });
    expect(tarefaId).toBeGreaterThan(0);
    expect(criada.body).not.toHaveProperty('extra');

    for (const tituloInvalido of [null, '', 123, 'a'.repeat(192)]) {
      await request(http)
        .patch('/tarefas/' + tarefaId)
        .send({ titulo: tituloInvalido })
        .expect(400);
    }
    for (const concluida of [null, 'true', 1]) {
      await request(http)
        .patch('/tarefas/' + tarefaId)
        .send({ concluida })
        .expect(400);
    }
    const atualizada = await request(http)
      .patch('/tarefas/' + tarefaId)
      .send({ concluida: true, id: -1, extra: 'ignorar' })
      .expect(200);
    expect(atualizada.body).toMatchObject({
      id: tarefaId,
      titulo,
      concluida: true,
    });
    expect(atualizada.body).not.toHaveProperty('extra');
    const renomeada = await request(http)
      .patch('/tarefas/' + tarefaId)
      .send({ titulo: 'Titulo atualizado' })
      .expect(200);
    expect(renomeada.body).toMatchObject({
      titulo: 'Titulo atualizado',
      concluida: true,
    });
    await request(http)
      .get('/tarefas/' + tarefaId)
      .expect(200)
      .expect(renomeada.body);
  });

  it('retorna 400 para IDs que nao sao numeros inteiros', async () => {
    const http = app.getHttpServer();
    for (const id of ['abc', '1.5']) {
      await request(http).get(`/tarefas/${id}`).expect(400);
      await request(http)
        .patch(`/tarefas/${id}`)
        .send({ concluida: true })
        .expect(400);
      await request(http).delete(`/tarefas/${id}`).expect(400);
    }
  });
});
