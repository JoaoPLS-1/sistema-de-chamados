import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { hashToken } from '../src/auth/senhas.js';

describe('Autenticacao e autorizacao (guard real, MySQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: AuthService;
  let solicitante: { id: number; email: string };
  let tecnico: { id: number; email: string };
  let outro: { id: number; email: string };
  let tipoId: number;
  let chamados: number[];
  const senha = 'Senha de teste 123!';
  const http = () => app.getHttpServer();
  const login = (email: string, senhaEnviada = senha) =>
    request(http()).post('/auth/login').send({ email, senha: senhaEnviada });
  const token = async (pessoa = solicitante) =>
    (await login(pessoa.email).expect(200)).body.token as string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
    auth = app.get(AuthService);
  });
  beforeEach(async () => {
    chamados = [];
    const criar = async (tipo: 'SOLICITANTE' | 'TECNICO') => {
      const pessoa = await prisma.pessoa.create({
        data: {
          nome: 'Teste auth',
          email: randomUUID() + '@example.com',
          tipo,
        },
      });
      await auth.definirSenha(pessoa.id, senha);
      return pessoa;
    };
    solicitante = await criar('SOLICITANTE');
    tecnico = await criar('TECNICO');
    outro = await criar('SOLICITANTE');
    tipoId = (
      await prisma.tipoProblema.create({ data: { nome: randomUUID() } })
    ).id;
  });
  afterEach(async () => {
    await prisma.comentario.deleteMany({
      where: { chamadoId: { in: chamados } },
    });
    await prisma.chamado.deleteMany({ where: { id: { in: chamados } } });
    await prisma.pessoa.deleteMany({
      where: { id: { in: [solicitante.id, tecnico.id, outro.id] } },
    });
    await prisma.tipoProblema.delete({ where: { id: tipoId } });
  });
  afterAll(async () => {
    await app?.close();
  });

  async function abrir(bearer: string, extra: Record<string, unknown> = {}) {
    const res = await request(http())
      .post('/chamados')
      .auth(bearer, { type: 'bearer' })
      .send({
        titulo: 'Falha de acesso',
        descricao: 'Descricao completa do problema',
        tipoProblemaId: tipoId,
        ...extra,
      })
      .expect(201);
    chamados.push(res.body.id);
    return res.body;
  }

  it('protege todas as familias de rotas e rejeita bearer malformado ou desconhecido', async () => {
    for (const rota of [
      '/',
      '/pessoas',
      '/tipos-problema',
      '/chamados',
      '/tarefas',
      '/auth/me',
    ])
      await request(http()).get(rota).expect(401);
    await request(http())
      .get('/chamados')
      .set('Authorization', 'Basic abc')
      .expect(401);
    await request(http())
      .get('/chamados')
      .auth('a'.repeat(43), { type: 'bearer' })
      .expect(401);
  });

  it('normaliza email, emite sessao de oito horas e nao expoe hashes ou senha', async () => {
    const res = await login(' ' + solicitante.email.toUpperCase() + ' ').expect(
      200,
    );
    expect(res.body.token).toHaveLength(43);
    expect(res.body.pessoa.id).toBe(solicitante.id);
    expect(Date.parse(res.body.expiraEm) - Date.now()).toBeGreaterThan(
      7.9 * 60 * 60 * 1000,
    );
    const sessao = await prisma.sessao.findUniqueOrThrow({
      where: { tokenHash: hashToken(res.body.token) },
    });
    expect(sessao.tokenHash).not.toBe(res.body.token);
    const me = await request(http())
      .get('/auth/me')
      .auth(res.body.token, { type: 'bearer' })
      .expect(200);
    expect(Object.keys(me.body).sort()).toEqual([
      'email',
      'id',
      'nome',
      'tipo',
    ]);
    const tecnicoBearer = await token(tecnico);
    const pessoas = await request(http())
      .get('/pessoas')
      .auth(tecnicoBearer, { type: 'bearer' })
      .expect(200);
    const pessoa = pessoas.body.find(
      (p: { id: number }) => p.id === solicitante.id,
    );
    expect(pessoa).not.toHaveProperty('credencial');
    expect(pessoa).not.toHaveProperty('senhaHash');
  });

  it('retorna a mesma resposta para email inexistente, senha errada e pessoa inativa', async () => {
    const errado = await login(solicitante.email, 'Incorreta').expect(401);
    const inexistente = await login(randomUUID() + '@example.com').expect(401);
    await prisma.pessoa.update({
      where: { id: solicitante.id },
      data: { ativa: false },
    });
    const inativo = await login(solicitante.email).expect(401);
    expect(errado.body).toEqual(inexistente.body);
    expect(errado.body).toEqual(inativo.body);
  });

  it.each([
    { email: 'invalido', senha },
    { email: 'teste@example.com' },
    { email: 'teste@example.com', senha: null },
  ])('valida login %j', async (body) => {
    await request(http()).post('/auth/login').send(body).expect(400);
  });

  it('revoga no logout e rejeita sessao expirada ou pessoa desativada', async () => {
    const primeiro = await token();
    await request(http())
      .post('/auth/logout')
      .auth(primeiro, { type: 'bearer' })
      .expect(204);
    await request(http())
      .get('/auth/me')
      .auth(primeiro, { type: 'bearer' })
      .expect(401);
    const segundo = await token();
    await prisma.sessao.update({
      where: { tokenHash: hashToken(segundo) },
      data: { expiraEm: new Date(0) },
    });
    await request(http())
      .get('/auth/me')
      .auth(segundo, { type: 'bearer' })
      .expect(401);
    const terceiro = await token();
    const tecnicoBearer = await token(tecnico);
    await request(http())
      .patch(`/pessoas/${solicitante.id}`)
      .auth(tecnicoBearer, { type: 'bearer' })
      .send({ ativa: false })
      .expect(200);
    await request(http())
      .get('/auth/me')
      .auth(terceiro, { type: 'bearer' })
      .expect(401);
    await request(http())
      .patch(`/pessoas/${solicitante.id}`)
      .auth(tecnicoBearer, { type: 'bearer' })
      .send({ ativa: true })
      .expect(200);
    await request(http())
      .get('/auth/me')
      .auth(terceiro, { type: 'bearer' })
      .expect(401);
  });

  it('usa identidade do token ao abrir e comentar, ignorando IDs enviados no corpo', async () => {
    const bearer = await token();
    const chamado = await abrir(bearer, { solicitanteId: outro.id });
    expect(chamado.solicitanteId).toBe(solicitante.id);
    const res = await request(http())
      .post(`/chamados/${chamado.id}/comentarios`)
      .auth(bearer, { type: 'bearer' })
      .send({ corpo: 'Mensagem autenticada', autorId: tecnico.id })
      .expect(201);
    expect(res.body.autorId).toBe(solicitante.id);
    const outroBearer = await token(outro);
    await request(http())
      .post(`/chamados/${chamado.id}/comentarios`)
      .auth(outroBearer, { type: 'bearer' })
      .send({ corpo: 'Tentativa de personificacao', autorId: solicitante.id })
      .expect(409);
  });

  it('limita consultas e edicao do solicitante aos proprios chamados', async () => {
    const bearer = await token();
    const chamado = await abrir(bearer);
    const outroBearer = await token(outro);
    const lista = await request(http())
      .get('/chamados')
      .auth(outroBearer, { type: 'bearer' })
      .expect(200);
    expect(lista.body.map((c: { id: number }) => c.id)).not.toContain(
      chamado.id,
    );
    await request(http())
      .get(`/chamados/${chamado.id}`)
      .auth(outroBearer, { type: 'bearer' })
      .expect(404);
    await request(http())
      .patch(`/chamados/${chamado.id}`)
      .auth(outroBearer, { type: 'bearer' })
      .send({ titulo: 'Outro titulo' })
      .expect(404);
    const tecnicoBearer = await token(tecnico);
    await request(http())
      .get(`/chamados/${chamado.id}`)
      .auth(tecnicoBearer, { type: 'bearer' })
      .expect(200);
  });

  it('reserva manutencao, designacao e situacao a tecnicos', async () => {
    const bearer = await token();
    const chamado = await abrir(bearer);
    await request(http())
      .get('/pessoas')
      .auth(bearer, { type: 'bearer' })
      .expect(403);
    await request(http())
      .post('/tipos-problema')
      .auth(bearer, { type: 'bearer' })
      .send({ nome: 'Novo' })
      .expect(403);
    await request(http())
      .patch(`/chamados/${chamado.id}/tecnico`)
      .auth(bearer, { type: 'bearer' })
      .send({ tecnicoId: tecnico.id })
      .expect(403);
    await request(http())
      .patch(`/chamados/${chamado.id}/situacao`)
      .auth(bearer, { type: 'bearer' })
      .send({ situacao: 'CANCELADO' })
      .expect(403);
    const tecnicoBearer = await token(tecnico);
    await request(http())
      .patch(`/chamados/${chamado.id}/tecnico`)
      .auth(tecnicoBearer, { type: 'bearer' })
      .send({ tecnicoId: tecnico.id })
      .expect(200);
    await request(http())
      .post(`/chamados/${chamado.id}/comentarios`)
      .auth(tecnicoBearer, { type: 'bearer' })
      .send({ corpo: 'Estou verificando' })
      .expect(201);
  });

  it('somente tecnico define senha, revogando sessoes existentes', async () => {
    const antigo = await token();
    const bearer = await token(tecnico);
    const url = `/pessoas/${solicitante.id}/senha`;
    await request(http())
      .put(url)
      .auth(antigo, { type: 'bearer' })
      .send({ senha: 'Nova senha 123!' })
      .expect(403);
    await request(http())
      .put(url)
      .auth(bearer, { type: 'bearer' })
      .send({ senha: 'curta' })
      .expect(400);
    await request(http())
      .put(url)
      .auth(bearer, { type: 'bearer' })
      .send({ senha: 'Nova senha 123!' })
      .expect(204);
    await request(http())
      .get('/auth/me')
      .auth(antigo, { type: 'bearer' })
      .expect(401);
    await login(solicitante.email).expect(401);
    await login(solicitante.email, 'Nova senha 123!').expect(200);
  });
});
