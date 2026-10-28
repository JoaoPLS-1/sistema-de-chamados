import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SituacaoChamado, TipoPessoa } from '../src/generated/prisma/enums.js';

describe('Chamados (e2e com MySQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let solicitanteId: number;
  let tecnicoId: number;
  let outroTecnicoId: number;
  let tipoProblemaId: number;
  let chamados: number[];
  let pessoas: number[];
  let tipos: number[];
  const http = () => app.getHttpServer();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    chamados = [];
    pessoas = [];
    tipos = [];
    solicitanteId = await criarPessoa(TipoPessoa.SOLICITANTE);
    tecnicoId = await criarPessoa(TipoPessoa.TECNICO);
    outroTecnicoId = await criarPessoa(TipoPessoa.TECNICO);
    tipoProblemaId = await criarTipo();
  });
  afterEach(async () => {
    await prisma.chamado.deleteMany({ where: { id: { in: chamados } } });
    await prisma.pessoa.deleteMany({ where: { id: { in: pessoas } } });
    await prisma.tipoProblema.deleteMany({ where: { id: { in: tipos } } });
  });
  afterAll(async () => {
    await app?.close();
  });

  async function criarPessoa(tipo: TipoPessoa, ativa = true) {
    const pessoa = await prisma.pessoa.create({
      data: {
        nome: 'Teste chamados',
        email: randomUUID() + '@example.com',
        tipo,
        ativa,
      },
    });
    pessoas.push(pessoa.id);
    return pessoa.id;
  }
  async function criarTipo(ativo = true) {
    const tipo = await prisma.tipoProblema.create({
      data: { nome: 'Teste ' + randomUUID(), ativo },
    });
    tipos.push(tipo.id);
    return tipo.id;
  }
  async function abrir(extra: Record<string, unknown> = {}, status = 201) {
    const res = await request(http())
      .post('/chamados')
      .send({
        titulo: 'Falha de rede',
        descricao: 'Nao consigo acessar a rede interna',
        solicitanteId,
        tipoProblemaId,
        ...extra,
      });
    if (res.status === 201) chamados.push(res.body.id);
    expect(res.status, JSON.stringify(res.body)).toBe(status);
    return res.body;
  }
  const designar = (id: number, tecnico = tecnicoId, status = 200) =>
    request(http())
      .patch('/chamados/' + id + '/tecnico')
      .send({ tecnicoId: tecnico })
      .expect(status);
  const mudar = (id: number, situacao: SituacaoChamado, status = 200) =>
    request(http())
      .patch('/chamados/' + id + '/situacao')
      .send({ situacao })
      .expect(status);
  async function emAtendimento() {
    const chamado = await abrir();
    return (await designar(chamado.id)).body;
  }
  async function preparar(situacao: SituacaoChamado) {
    const chamado = await abrir();
    if (['EM_ATENDIMENTO', 'RESOLVIDO', 'FECHADO'].includes(situacao))
      await designar(chamado.id);
    if (situacao === 'RESOLVIDO' || situacao === 'FECHADO')
      await mudar(chamado.id, 'RESOLVIDO');
    if (situacao === 'FECHADO') await mudar(chamado.id, 'FECHADO');
    if (situacao === 'CANCELADO') await mudar(chamado.id, 'CANCELADO');
    return (
      await request(http())
        .get('/chamados/' + chamado.id)
        .expect(200)
    ).body;
  }

  it('abre sem tecnico, com prioridade media, normaliza texto e protege campos do servidor', async () => {
    const chamado = await abrir({
      titulo: '  Falha de rede  ',
      descricao: '  Descricao detalhada  ',
      situacao: 'FECHADO',
      tecnicoId,
      resolvidoEm: new Date().toISOString(),
    });
    expect(chamado).toMatchObject({
      titulo: 'Falha de rede',
      descricao: 'Descricao detalhada',
      situacao: 'ABERTO',
      prioridade: 'MEDIA',
      tecnicoId: null,
      resolvidoEm: null,
      solicitanteId,
      tipoProblemaId,
    });
    expect(chamado.solicitante).toMatchObject({
      id: solicitanteId,
      tipo: 'SOLICITANTE',
    });
    expect(chamado.tipoProblema.id).toBe(tipoProblemaId);
    expect(chamado.solicitante).not.toHaveProperty('temHistoricoChamados');
    await request(http())
      .get('/chamados/' + chamado.id)
      .expect(200)
      .expect({ ...chamado, comentarios: [] });
    const lista = await request(http()).get('/chamados').expect(200);
    expect(lista.body).toContainEqual(chamado);
    const ids = lista.body.map((c: { id: number }) => c.id);
    expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));
    await request(http())
      .delete('/chamados/' + chamado.id)
      .expect(404);
  });

  it.each(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'])(
    'aceita prioridade %s',
    async (prioridade) => {
      expect((await abrir({ prioridade })).prioridade).toBe(prioridade);
    },
  );

  it('aceita limites de titulo e descricao e valida edicao parcial', async () => {
    const chamado = await abrir({
      titulo: 'a'.repeat(5),
      descricao: 'b'.repeat(10),
    });
    const atualizada = await request(http())
      .patch('/chamados/' + chamado.id)
      .send({
        titulo: 'a'.repeat(100),
        prioridade: 'CRITICA',
        tecnicoId,
        situacao: 'RESOLVIDO',
        solicitanteId: tecnicoId,
      })
      .expect(200);
    expect(atualizada.body).toMatchObject({
      titulo: 'a'.repeat(100),
      descricao: 'b'.repeat(10),
      prioridade: 'CRITICA',
      tecnicoId: null,
      situacao: 'ABERTO',
      solicitanteId,
    });
    for (const body of [
      { titulo: null },
      { titulo: '1234' },
      { titulo: 'a'.repeat(101) },
      { descricao: null },
      { descricao: '123456789' },
      { prioridade: null },
      { prioridade: 'URGENTE' },
    ]) {
      await request(http())
        .patch('/chamados/' + chamado.id)
        .send(body)
        .expect(400);
    }
    await request(http())
      .get('/chamados/' + chamado.id)
      .expect(200)
      .expect({ ...atualizada.body, comentarios: [] });
  });

  it.each([
    { titulo: undefined },
    { titulo: null },
    { titulo: '1234' },
    { titulo: 'a'.repeat(101) },
    { titulo: '     ' },
    { titulo: 123 },
    { descricao: undefined },
    { descricao: null },
    { descricao: '123456789' },
    { descricao: '          ' },
    { descricao: true },
    { prioridade: null },
    { prioridade: 'URGENTE' },
    { solicitanteId: undefined },
    { solicitanteId: null },
    { solicitanteId: '1' },
    { solicitanteId: 0 },
    { solicitanteId: -1 },
    { solicitanteId: 1.5 },
    { tipoProblemaId: undefined },
    { tipoProblemaId: null },
    { tipoProblemaId: '1' },
    { tipoProblemaId: 0 },
  ])('rejeita abertura invalida: %j', async (invalido) => {
    await abrir(invalido, 400);
  });

  it('bloqueia solicitante inativo, perfil incorreto e tipo desativado sem marcar historico', async () => {
    await prisma.pessoa.update({
      where: { id: solicitanteId },
      data: { ativa: false },
    });
    await abrir({}, 409);
    await prisma.pessoa.update({
      where: { id: solicitanteId },
      data: { ativa: true },
    });
    await abrir({ solicitanteId: tecnicoId }, 409);
    await prisma.tipoProblema.update({
      where: { id: tipoProblemaId },
      data: { ativo: false },
    });
    await abrir({}, 409);
    expect(
      (await prisma.pessoa.findUniqueOrThrow({ where: { id: solicitanteId } }))
        .temHistoricoChamados,
    ).toBe(false);
    expect(
      (
        await prisma.tipoProblema.findUniqueOrThrow({
          where: { id: tipoProblemaId },
        })
      ).temHistoricoChamados,
    ).toBe(false);
    const removida = await criarPessoa(TipoPessoa.SOLICITANTE);
    await prisma.pessoa.delete({ where: { id: removida } });
    await abrir({ solicitanteId: removida }, 404);
    const tipoRemovido = await criarTipo();
    await prisma.tipoProblema.delete({ where: { id: tipoRemovido } });
    await abrir({ tipoProblemaId: tipoRemovido }, 404);
  });

  it('designa apenas tecnico ativo e inicia atendimento automaticamente', async () => {
    const chamado = await abrir();
    await designar(chamado.id, solicitanteId, 409);
    const outroSolicitante = await criarPessoa(TipoPessoa.SOLICITANTE);
    await designar(chamado.id, outroSolicitante, 409);
    await prisma.pessoa.update({
      where: { id: tecnicoId },
      data: { ativa: false },
    });
    await designar(chamado.id, tecnicoId, 409);
    const removido = await criarPessoa(TipoPessoa.TECNICO);
    await prisma.pessoa.delete({ where: { id: removido } });
    await designar(chamado.id, removido, 404);
    for (const valor of [null, '1', 0, 1.5]) {
      await request(http())
        .patch('/chamados/' + chamado.id + '/tecnico')
        .send({ tecnicoId: valor })
        .expect(400);
    }
    const designado = await designar(chamado.id, outroTecnicoId);
    expect(designado.body).toMatchObject({
      tecnicoId: outroTecnicoId,
      situacao: 'EM_ATENDIMENTO',
      resolvidoEm: null,
    });
  });

  it('proibe atender o proprio chamado mesmo apos mudar de perfil', async () => {
    const chamado = await abrir();
    await prisma.pessoa.update({
      where: { id: solicitanteId },
      data: { tipo: TipoPessoa.TECNICO },
    });
    await designar(chamado.id, solicitanteId, 409);
  });

  it('registra historico real de solicitante, tipo e todos os tecnicos anteriores', async () => {
    const chamado = await abrir();
    await request(http())
      .delete('/pessoas/' + solicitanteId)
      .expect(409);
    await request(http())
      .delete('/tipos-problema/' + tipoProblemaId)
      .expect(409);
    await designar(chamado.id);
    await designar(chamado.id, outroTecnicoId);
    await request(http())
      .delete('/pessoas/' + tecnicoId)
      .expect(409);
    await request(http())
      .delete('/pessoas/' + outroTecnicoId)
      .expect(409);
    await request(http())
      .patch('/pessoas/' + solicitanteId)
      .send({ ativa: false })
      .expect(200);
    await request(http())
      .patch('/pessoas/' + tecnicoId)
      .send({ ativa: false })
      .expect(200);
    await request(http())
      .patch('/tipos-problema/' + tipoProblemaId)
      .send({ ativo: false })
      .expect(200);
    await mudar(chamado.id, 'RESOLVIDO');
    await mudar(chamado.id, 'FECHADO');
    await request(http())
      .delete('/pessoas/' + tecnicoId)
      .expect(409);
    await request(http())
      .delete('/tipos-problema/' + tipoProblemaId)
      .expect(409);
  });

  const estados = Object.values(SituacaoChamado);
  const permitidas: Record<SituacaoChamado, SituacaoChamado[]> = {
    ABERTO: ['CANCELADO'], // O inicio do atendimento e realizado pela designacao.
    EM_ATENDIMENTO: ['RESOLVIDO', 'CANCELADO'],
    RESOLVIDO: ['EM_ATENDIMENTO', 'FECHADO'],
    FECHADO: [],
    CANCELADO: [],
  };
  it.each(
    estados.flatMap((origem) =>
      estados.map((destino) => [origem, destino] as const),
    ),
  )('verifica transicao %s -> %s', async (origem, destino) => {
    const chamado = await preparar(origem);
    const permitido = permitidas[origem].includes(destino);
    const res = await mudar(chamado.id, destino, permitido ? 200 : 409);
    if (permitido) expect(res.body.situacao).toBe(destino);
    else
      await request(http())
        .get('/chamados/' + chamado.id)
        .expect(200)
        .expect(chamado);
  });

  it('registra resolucao, preserva a data na reabertura e atualiza na proxima resolucao', async () => {
    const chamado = await emAtendimento();
    const inicio = Date.now();
    const resolvido = (await mudar(chamado.id, 'RESOLVIDO')).body;
    expect(Date.parse(resolvido.resolvidoEm)).toBeGreaterThanOrEqual(inicio);
    const reaberto = (await mudar(chamado.id, 'EM_ATENDIMENTO')).body;
    expect(reaberto.resolvidoEm).toBe(resolvido.resolvidoEm);
    const novamente = (await mudar(chamado.id, 'RESOLVIDO')).body;
    expect(Date.parse(novamente.resolvidoEm)).toBeGreaterThanOrEqual(
      Date.parse(resolvido.resolvidoEm),
    );
    const fechado = (await mudar(chamado.id, 'FECHADO')).body;
    expect(fechado.resolvidoEm).toBe(novamente.resolvidoEm);
  });

  it.each(['FECHADO', 'CANCELADO'] as const)(
    'impede qualquer edicao ou designacao em %s',
    async (situacao) => {
      const chamado = await preparar(situacao);
      await request(http())
        .patch('/chamados/' + chamado.id)
        .send({ titulo: 'Novo titulo' })
        .expect(409);
      await designar(chamado.id, outroTecnicoId, 409);
      await request(http())
        .get('/chamados/' + chamado.id)
        .expect(200)
        .expect(chamado);
    },
  );

  it('filtra por situacao, prioridade, tipo e tecnico com combinacao de filtros', async () => {
    const primeiro = await abrir({ prioridade: 'ALTA' });
    await designar(primeiro.id);
    const segundo = await abrir();
    const outroTipo = await criarTipo();
    const terceiro = await abrir({
      tipoProblemaId: outroTipo,
      prioridade: 'ALTA',
    });
    await designar(terceiro.id, outroTecnicoId);
    for (const [campo, valor] of [
      ['situacao', 'EM_ATENDIMENTO'],
      ['prioridade', 'ALTA'],
      ['tipoProblemaId', tipoProblemaId],
      ['tecnicoId', tecnicoId],
    ] as const) {
      const lista = await request(http())
        .get('/chamados')
        .query({ [campo]: valor })
        .expect(200);
      expect(lista.body.some((c: { id: number }) => c.id === primeiro.id)).toBe(
        true,
      );
      expect(
        lista.body.every((c: Record<string, unknown>) => c[campo] === valor),
      ).toBe(true);
    }
    const combinada = await request(http())
      .get('/chamados')
      .query({
        situacao: 'EM_ATENDIMENTO',
        prioridade: 'ALTA',
        tipoProblemaId,
        tecnicoId,
      })
      .expect(200);
    expect(combinada.body.map((c: { id: number }) => c.id)).toEqual([
      primeiro.id,
    ]);
    const vazia = await request(http())
      .get('/chamados')
      .query({ situacao: 'ABERTO', tecnicoId })
      .expect(200);
    expect(vazia.body).toEqual([]);
    const semFiltro = await request(http()).get('/chamados').expect(200);
    expect(semFiltro.body.map((c: { id: number }) => c.id)).toEqual(
      expect.arrayContaining([primeiro.id, segundo.id, terceiro.id]),
    );
  });

  it.each([
    'situacao=INVALIDA',
    'situacao=',
    'prioridade=URGENTE',
    'prioridade=',
    'tipoProblemaId=abc',
    'tipoProblemaId=0',
    'tipoProblemaId=1.5',
    'tecnicoId=-1',
    'tecnicoId=',
    'tecnicoId=1&tecnicoId=2',
  ])('rejeita filtro invalido %s', async (filtro) => {
    await request(http())
      .get('/chamados?' + filtro)
      .expect(400);
  });

  it('retorna 400 para IDs e situacoes invalidas e 404 para chamado inexistente', async () => {
    const chamado = await abrir();
    for (const situacao of [null, 'INVALIDA', 123]) {
      await request(http())
        .patch('/chamados/' + chamado.id + '/situacao')
        .send({ situacao })
        .expect(400);
    }
    await prisma.chamado.delete({ where: { id: chamado.id } });
    for (const [id, status] of [
      ['abc', 400],
      ['1.5', 400],
      [String(chamado.id), 404],
    ] as const) {
      await request(http())
        .get('/chamados/' + id)
        .expect(status);
      await request(http())
        .patch('/chamados/' + id)
        .send({ titulo: 'Novo titulo' })
        .expect(status);
      await request(http())
        .patch('/chamados/' + id + '/tecnico')
        .send({ tecnicoId })
        .expect(status);
      await request(http())
        .patch('/chamados/' + id + '/situacao')
        .send({ situacao: 'CANCELADO' })
        .expect(status);
    }
  });

  it('nao ocupa nova vaga ao manter o mesmo tecnico e libera vaga ao resolver ou trocar', async () => {
    const emCurso = [];
    for (let i = 0; i < 5; i++) emCurso.push(await emAtendimento());
    const sexto = await abrir();
    await designar(emCurso[0].id);
    await designar(sexto.id, tecnicoId, 409);
    await mudar(emCurso[0].id, 'RESOLVIDO');
    await designar(sexto.id);
    await mudar(emCurso[0].id, 'EM_ATENDIMENTO', 409);
    await designar(emCurso[1].id, outroTecnicoId);
    await mudar(emCurso[0].id, 'EM_ATENDIMENTO');
    expect(
      await prisma.chamado.count({
        where: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
      }),
    ).toBe(5);
  });

  it('revalida atividade e perfil do tecnico na reabertura', async () => {
    const chamado = await preparar('RESOLVIDO');
    await prisma.pessoa.update({
      where: { id: tecnicoId },
      data: { ativa: false },
    });
    await mudar(chamado.id, 'EM_ATENDIMENTO', 409);
    await prisma.pessoa.update({
      where: { id: tecnicoId },
      data: { ativa: true, tipo: TipoPessoa.SOLICITANTE },
    });
    await mudar(chamado.id, 'EM_ATENDIMENTO', 409);
    await prisma.pessoa.update({
      where: { id: tecnicoId },
      data: { tipo: TipoPessoa.TECNICO },
    });
    await mudar(chamado.id, 'EM_ATENDIMENTO');
  });

  it('impede duas designacoes simultaneas de ultrapassarem cinco atendimentos', async () => {
    for (let i = 0; i < 4; i++) await emAtendimento();
    const a = await abrir();
    const b = await abrir();
    const respostas = await Promise.all(
      [a, b].map((c) =>
        request(http())
          .patch('/chamados/' + c.id + '/tecnico')
          .send({ tecnicoId }),
      ),
    );
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.chamado.count({
        where: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
      }),
    ).toBe(5);
  });

  it('impede reaberturas simultaneas de ultrapassarem cinco atendimentos', async () => {
    const a = await preparar('RESOLVIDO');
    const b = await preparar('RESOLVIDO');
    for (let i = 0; i < 4; i++) await emAtendimento();
    const respostas = await Promise.all(
      [a, b].map((c) =>
        request(http())
          .patch('/chamados/' + c.id + '/situacao')
          .send({ situacao: 'EM_ATENDIMENTO' }),
      ),
    );
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.chamado.count({
        where: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
      }),
    ).toBe(5);
  });

  it('protege a ultima vaga disputada por designacao e reabertura', async () => {
    const resolvido = await preparar('RESOLVIDO');
    for (let i = 0; i < 4; i++) await emAtendimento();
    const aberto = await abrir();
    const respostas = await Promise.all([
      request(http())
        .patch('/chamados/' + resolvido.id + '/situacao')
        .send({ situacao: 'EM_ATENDIMENTO' }),
      request(http())
        .patch('/chamados/' + aberto.id + '/tecnico')
        .send({ tecnicoId }),
    ]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.chamado.count({
        where: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
      }),
    ).toBe(5);
  });

  it('serializa transicoes concorrentes no mesmo chamado', async () => {
    const chamado = await emAtendimento();
    const respostas = await Promise.all(
      ['RESOLVIDO', 'CANCELADO'].map((situacao) =>
        request(http())
          .patch('/chamados/' + chamado.id + '/situacao')
          .send({ situacao }),
      ),
    );
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    const persistido = await prisma.chamado.findUniqueOrThrow({
      where: { id: chamado.id },
    });
    expect(['RESOLVIDO', 'CANCELADO']).toContain(persistido.situacao);
  });
});
