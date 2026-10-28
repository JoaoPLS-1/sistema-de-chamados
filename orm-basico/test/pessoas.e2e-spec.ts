import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PessoasService } from '../src/pessoas/pessoas.service.js';
import { TipoPessoa } from '../src/generated/prisma/enums.js';

describe('Pessoas (e2e com MySQL)', () => {
  let app: INestApplication<App>;
  let ids: number[];
  const emailUnico = () => 'teste-' + randomUUID() + '@example.com';
  const cadastro = () => ({
    nome: 'Pessoa de teste',
    email: emailUnico(),
    tipo: 'SOLICITANTE',
  });

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
      .pessoa.deleteMany({ where: { id: { in: ids } } });
  });
  afterAll(async () => {
    await app?.close();
  });

  async function criar(dados: object = cadastro()) {
    const res = await request(app.getHttpServer()).post('/pessoas').send(dados);
    if (res.status === 201) ids.push(res.body.id);
    expect(res.status).toBe(201);
    return res.body;
  }

  it('executa CRUD, normaliza nome/e-mail, desativa e reativa sem perder dados', async () => {
    const http = app.getHttpServer();
    const email = emailUnico();
    const pessoa = await criar({
      nome: '  Pessoa de teste  ',
      email: '  ' + email.toUpperCase() + '  ',
      tipo: 'SOLICITANTE',
      temHistoricoChamados: true,
      extra: 'ignorar',
    });
    expect(pessoa).toMatchObject({
      nome: 'Pessoa de teste',
      email,
      tipo: 'SOLICITANTE',
      ativa: true,
    });
    expect(pessoa).not.toHaveProperty('extra');
    expect(pessoa).not.toHaveProperty('temHistoricoChamados');
    expect(Number.isNaN(Date.parse(pessoa.criadaEm))).toBe(false);
    await request(http)
      .get('/pessoas/' + pessoa.id)
      .expect(200)
      .expect(pessoa);
    const lista = await request(http).get('/pessoas').expect(200);
    expect(lista.body).toContainEqual(pessoa);
    const listIds = lista.body.map((p: { id: number }) => p.id);
    expect(listIds).toEqual([...listIds].sort((a: number, b: number) => a - b));

    const alterada = await request(http)
      .patch('/pessoas/' + pessoa.id)
      .send({ nome: '  Novo nome  ', tipo: 'TECNICO' })
      .expect(200);
    expect(alterada.body).toMatchObject({
      nome: 'Novo nome',
      tipo: 'TECNICO',
      email,
      ativa: true,
    });
    const inativa = await request(http)
      .patch('/pessoas/' + pessoa.id)
      .send({ ativa: false })
      .expect(200);
    expect(inativa.body).toMatchObject({
      nome: 'Novo nome',
      email,
      ativa: false,
    });
    await expect(
      app.get(PessoasService).buscarAtiva(pessoa.id),
    ).rejects.toBeInstanceOf(ConflictException);
    const reativada = await request(http)
      .patch('/pessoas/' + pessoa.id)
      .send({ ativa: true })
      .expect(200);
    expect(reativada.body.ativa).toBe(true);
    await expect(
      app.get(PessoasService).buscarAtiva(pessoa.id, TipoPessoa.TECNICO),
    ).resolves.toMatchObject({ id: pessoa.id });
    await expect(
      app.get(PessoasService).buscarAtiva(pessoa.id, TipoPessoa.SOLICITANTE),
    ).rejects.toBeInstanceOf(ConflictException);
    await request(http)
      .delete('/pessoas/' + pessoa.id)
      .expect(204)
      .expect('');
    await request(http)
      .get('/pessoas/' + pessoa.id)
      .expect(404);
    await request(http)
      .patch('/pessoas/' + pessoa.id)
      .send({ ativa: false })
      .expect(404);
    await request(http)
      .delete('/pessoas/' + pessoa.id)
      .expect(404);
  });

  it.each(['SOLICITANTE', 'TECNICO'])(
    'permite cadastrar %s inativo',
    async (tipo) => {
      const pessoa = await criar({ ...cadastro(), tipo, ativa: false });
      expect(pessoa).toMatchObject({ tipo, ativa: false });
    },
  );

  it('rejeita e-mail repetido na criacao e na atualizacao, inclusive para inativos', async () => {
    const primeira = await criar();
    const segunda = await criar();
    await request(app.getHttpServer())
      .patch('/pessoas/' + primeira.id)
      .send({ ativa: false })
      .expect(200);
    const duplicada = await request(app.getHttpServer())
      .post('/pessoas')
      .send({ ...cadastro(), email: ' ' + primeira.email.toUpperCase() + ' ' });
    if (duplicada.status === 201) ids.push(duplicada.body.id);
    expect(duplicada.status).toBe(409);
    await request(app.getHttpServer())
      .patch('/pessoas/' + segunda.id)
      .send({ email: primeira.email })
      .expect(409);
    await request(app.getHttpServer())
      .get('/pessoas/' + segunda.id)
      .expect(200)
      .expect(segunda);
    const mesmoEmail = await request(app.getHttpServer())
      .patch('/pessoas/' + segunda.id)
      .send({ email: segunda.email.toUpperCase() })
      .expect(200);
    expect(mesmoEmail.body.email).toBe(segunda.email);
  });

  it('mantem unicidade mesmo com cadastros concorrentes', async () => {
    const dados = cadastro();
    const resultados = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer()).post('/pessoas').send(dados),
      ),
    );
    for (const res of resultados) if (res.status === 201) ids.push(res.body.id);
    expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  const invalidos = [
    { nome: undefined },
    { nome: null },
    { nome: '' },
    { nome: '   ' },
    { nome: 123 },
    { nome: 'a'.repeat(192) },
    { email: undefined },
    { email: null },
    { email: 'invalido' },
    { email: '' },
    { email: 123 },
    { tipo: undefined },
    { tipo: null },
    { tipo: 'ADMIN' },
    { tipo: 'tecnico' },
    { ativa: null },
    { ativa: 'false' },
    { ativa: 1 },
  ];
  it.each(invalidos)('rejeita cadastro invalido: %j', async (invalido) => {
    const res = await request(app.getHttpServer())
      .post('/pessoas')
      .send({ ...cadastro(), ...invalido });
    if (res.status === 201) ids.push(res.body.id);
    expect(res.status).toBe(400);
  });

  it('valida PATCH sem apagar campos omitidos nem aceitar null', async () => {
    const pessoa = await criar();
    for (const dados of [
      { nome: '' },
      { nome: null },
      { email: 'invalido' },
      { email: null },
      { tipo: 'ADMIN' },
      { tipo: null },
      { ativa: 'false' },
      { ativa: null },
    ]) {
      await request(app.getHttpServer())
        .patch('/pessoas/' + pessoa.id)
        .send(dados)
        .expect(400);
    }
    await request(app.getHttpServer())
      .get('/pessoas/' + pessoa.id)
      .expect(200)
      .expect(pessoa);
  });

  it('bloqueia exclusao de quem tem historico, permite desativar e protege o marcador interno', async () => {
    const pessoa = await criar();
    // Simula o vinculo que os futuros modulos de chamados/comentarios registrarao.
    await app
      .get(PrismaService)
      .pessoa.update({
        where: { id: pessoa.id },
        data: { temHistoricoChamados: true },
      });
    await request(app.getHttpServer())
      .delete('/pessoas/' + pessoa.id)
      .expect(409);
    const desativada = await request(app.getHttpServer())
      .patch('/pessoas/' + pessoa.id)
      .send({ ativa: false, temHistoricoChamados: false })
      .expect(200);
    expect(desativada.body.ativa).toBe(false);
    await request(app.getHttpServer())
      .delete('/pessoas/' + pessoa.id)
      .expect(409);
    const persistida = await app
      .get(PrismaService)
      .pessoa.findUniqueOrThrow({ where: { id: pessoa.id } });
    expect(persistida.temHistoricoChamados).toBe(true);
  });

  it('rejeita IDs invalidos e responde 404 para pessoa inexistente', async () => {
    const pessoa = await criar();
    await request(app.getHttpServer())
      .delete('/pessoas/' + pessoa.id)
      .expect(204);
    for (const id of ['abc', '1.5']) {
      await request(app.getHttpServer())
        .get('/pessoas/' + id)
        .expect(400);
      await request(app.getHttpServer())
        .patch('/pessoas/' + id)
        .send({ ativa: false })
        .expect(400);
      await request(app.getHttpServer())
        .delete('/pessoas/' + id)
        .expect(400);
    }
    await request(app.getHttpServer())
      .get('/pessoas/' + pessoa.id)
      .expect(404);
    await request(app.getHttpServer())
      .patch('/pessoas/' + pessoa.id)
      .send({ ativa: false })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/pessoas/' + pessoa.id)
      .expect(404);
  });
});
