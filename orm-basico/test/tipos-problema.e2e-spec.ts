import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TiposProblemaService } from '../src/tipos-problema/tipos-problema.service.js';

describe('Tipos de problema (e2e com MySQL)', () => {
  let app: INestApplication<App>;
  let ids: number[];
  const nomeUnico = () => 'Rede ' + randomUUID();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });
  beforeEach(() => {
    ids = [];
  });
  afterEach(async () => {
    await app
      .get(PrismaService)
      .tipoProblema.deleteMany({ where: { id: { in: ids } } });
  });
  afterAll(async () => {
    await app?.close();
  });

  async function criar(dados: object = { nome: nomeUnico() }) {
    const res = await request(app.getHttpServer())
      .post('/tipos-problema')
      .send(dados);
    if (res.status === 201) ids.push(res.body.id);
    expect(res.status).toBe(201);
    return res.body;
  }

  it('executa CRUD, normaliza nome e permite desativar e reativar', async () => {
    const http = app.getHttpServer();
    const nome = nomeUnico();
    const tipo = await criar({
      nome: '  ' + nome + '  ',
      id: -1,
      temHistoricoChamados: true,
      extra: 'ignorar',
    });
    expect(tipo).toMatchObject({ nome, ativo: true });
    expect(tipo.id).toBeGreaterThan(0);
    expect(tipo).not.toHaveProperty('extra');
    expect(tipo).not.toHaveProperty('temHistoricoChamados');
    expect(Number.isNaN(Date.parse(tipo.criadoEm))).toBe(false);
    await request(http)
      .get('/tipos-problema/' + tipo.id)
      .expect(200)
      .expect(tipo);
    const lista = await request(http).get('/tipos-problema').expect(200);
    expect(lista.body).toContainEqual(tipo);
    const listIds = lista.body.map((t: { id: number }) => t.id);
    expect(listIds).toEqual([...listIds].sort((a: number, b: number) => a - b));
    const novoNome = nomeUnico();
    const alterado = await request(http)
      .patch('/tipos-problema/' + tipo.id)
      .send({ nome: ' ' + novoNome + ' ' })
      .expect(200);
    expect(alterado.body).toMatchObject({ nome: novoNome, ativo: true });
    const desativado = await request(http)
      .patch('/tipos-problema/' + tipo.id)
      .send({ ativo: false })
      .expect(200);
    expect(desativado.body).toMatchObject({ nome: novoNome, ativo: false });
    await expect(
      app.get(TiposProblemaService).buscarAtivo(tipo.id),
    ).rejects.toBeInstanceOf(ConflictException);
    const listaInativos = await request(http)
      .get('/tipos-problema')
      .expect(200);
    expect(listaInativos.body).toContainEqual(desativado.body);
    await request(http)
      .patch('/tipos-problema/' + tipo.id)
      .send({ ativo: true })
      .expect(200);
    await expect(
      app.get(TiposProblemaService).buscarAtivo(tipo.id),
    ).resolves.toMatchObject({ id: tipo.id, ativo: true });
    await request(http)
      .delete('/tipos-problema/' + tipo.id)
      .expect(204)
      .expect('');
    await request(http)
      .get('/tipos-problema/' + tipo.id)
      .expect(404);
  });

  it('permite cadastrar desativado e aceita nome no limite de 191 caracteres', async () => {
    const nome = nomeUnico().padEnd(191, 'x');
    const tipo = await criar({ nome, ativo: false });
    expect(tipo).toMatchObject({ nome, ativo: false });
    await request(app.getHttpServer())
      .delete('/tipos-problema/' + tipo.id)
      .expect(204);
  });

  it('rejeita nome repetido no cadastro e na atualizacao, inclusive de tipos desativados', async () => {
    const primeiro = await criar();
    const segundo = await criar();
    const http = app.getHttpServer();
    await request(http)
      .patch('/tipos-problema/' + primeiro.id)
      .send({ ativo: false })
      .expect(200);
    const duplicado = await request(http)
      .post('/tipos-problema')
      .send({ nome: ' ' + primeiro.nome.toUpperCase() + ' ' });
    if (duplicado.status === 201) ids.push(duplicado.body.id);
    expect(duplicado.status).toBe(409);
    await request(http)
      .patch('/tipos-problema/' + segundo.id)
      .send({ nome: primeiro.nome })
      .expect(409);
    await request(http)
      .get('/tipos-problema/' + segundo.id)
      .expect(200)
      .expect(segundo);
    const mesmoNome = await request(http)
      .patch('/tipos-problema/' + segundo.id)
      .send({ nome: segundo.nome })
      .expect(200);
    expect(mesmoNome.body.nome).toBe(segundo.nome);
  });

  it('protege nome unico em cadastros concorrentes', async () => {
    const dados = { nome: nomeUnico() };
    const resultados = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer()).post('/tipos-problema').send(dados),
      ),
    );
    for (const res of resultados) if (res.status === 201) ids.push(res.body.id);
    expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it.each([
    { nome: undefined },
    { nome: null },
    { nome: '' },
    { nome: '   ' },
    { nome: 123 },
    { nome: [] },
    { nome: {} },
    { nome: 'a'.repeat(192) },
    { ativo: null },
    { ativo: 'false' },
    { ativo: 1 },
  ])('rejeita cadastro invalido: %j', async (invalido) => {
    const res = await request(app.getHttpServer())
      .post('/tipos-problema')
      .send({ nome: nomeUnico(), ...invalido });
    if (res.status === 201) ids.push(res.body.id);
    expect(res.status).toBe(400);
  });

  it('valida PATCH e preserva os dados quando o corpo e invalido', async () => {
    const tipo = await criar();
    for (const dados of [
      { nome: null },
      { nome: '' },
      { nome: '   ' },
      { nome: 123 },
      { nome: 'a'.repeat(192) },
      { ativo: null },
      { ativo: 'false' },
    ]) {
      await request(app.getHttpServer())
        .patch('/tipos-problema/' + tipo.id)
        .send(dados)
        .expect(400);
    }
    await request(app.getHttpServer())
      .get('/tipos-problema/' + tipo.id)
      .expect(200)
      .expect(tipo);
  });

  it('protege historico contra exclusao e alteracao via API e permite desativar', async () => {
    const tipo = await criar();
    // Simula o primeiro uso que sera registrado pelo modulo de chamados.
    await app
      .get(PrismaService)
      .tipoProblema.update({
        where: { id: tipo.id },
        data: { temHistoricoChamados: true },
      });
    await request(app.getHttpServer())
      .delete('/tipos-problema/' + tipo.id)
      .expect(409);
    const desativado = await request(app.getHttpServer())
      .patch('/tipos-problema/' + tipo.id)
      .send({ ativo: false, temHistoricoChamados: false, id: -1 })
      .expect(200);
    expect(desativado.body).toMatchObject({
      id: tipo.id,
      nome: tipo.nome,
      ativo: false,
    });
    expect(desativado.body).not.toHaveProperty('temHistoricoChamados');
    await request(app.getHttpServer())
      .delete('/tipos-problema/' + tipo.id)
      .expect(409);
    const persistido = await app
      .get(PrismaService)
      .tipoProblema.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(persistido.temHistoricoChamados).toBe(true);
  });

  it('retorna 400 para ID invalido e 404 para tipo inexistente', async () => {
    const tipo = await criar();
    await request(app.getHttpServer())
      .delete('/tipos-problema/' + tipo.id)
      .expect(204);
    for (const id of ['abc', '1.5']) {
      await request(app.getHttpServer())
        .get('/tipos-problema/' + id)
        .expect(400);
      await request(app.getHttpServer())
        .patch('/tipos-problema/' + id)
        .send({ ativo: false })
        .expect(400);
      await request(app.getHttpServer())
        .delete('/tipos-problema/' + id)
        .expect(400);
    }
    await request(app.getHttpServer())
      .get('/tipos-problema/' + tipo.id)
      .expect(404);
    await request(app.getHttpServer())
      .patch('/tipos-problema/' + tipo.id)
      .send({ ativo: false })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/tipos-problema/' + tipo.id)
      .expect(404);
    await expect(
      app.get(TiposProblemaService).buscarAtivo(tipo.id),
    ).rejects.toMatchObject({ status: 404 });
  });
});
