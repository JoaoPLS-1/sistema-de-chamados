# Regras implementadas e testes

Esta matriz relaciona as 21 [regras do enunciado](regras-de-negocio.md) à implementação da API. O estado do banco depende da preparação do ambiente; consulte o [README](../README.md) para aplicar migrações e reproduzir as verificações.

## Situação por regra

| Regra | Requisito | Situacao e evidencia |
| --- | --- | --- |
| 1 | E-mail valido e unico | Implementado em pessoas; testes de validacao, normalizacao e unicidade concorrente |
| 2 | Solicitante ou tecnico | Implementado com enum no banco e validacao dos DTOs |
| 3 | Inativos nao abrem, atendem ou comentam | Implementado: abertura, designacao, reabertura e comentarios verificam atividade na transacao |
| 4 | Pessoa com historico nao pode ser removida | Implementado: historico de solicitante e tecnicos registrado transacionalmente, preservado apos troca de responsavel e testado com chamados reais |
| 5 | Nome de tipo de problema unico | Implementado; restricao unica no banco, validacao e testes concorrentes |
| 6 | Tipo desativado nao aceita novos chamados | Implementado: tipo ativo verificado com bloqueio na transacao de abertura |
| 7 | Tipo usado nao pode ser removido | Implementado: primeiro uso marcado na abertura e exclusao protegida por historico e chave estrangeira |
| 8 | Chamado nasce aberto e sem tecnico | Implementado: ABERTO e sem tecnico, sem aceitar sobrescrita pelo corpo da requisicao |
| 9 | Abertura por solicitante ativo | Implementado: solicitante ativo validado na transacao de abertura |
| 10 | Titulo de 5 a 100; descricao minima de 10 | Implementado: titulo de 5 a 100 e descricao minima de 10 apos trim; limites e tipos testados |
| 11 | Prioridade valida, media por padrao | Implementado: BAIXA, MEDIA, ALTA, CRITICA; MEDIA por padrao |
| 12 | Responsavel e um tecnico ativo | Implementado: designacao apenas de tecnico ativo |
| 13 | Designacao inicia atendimento | Implementado: designacao em ABERTO inicia EM_ATENDIMENTO automaticamente |
| 14 | Somente transicoes permitidas | Implementado: todas as 25 combinacoes de origem/destino testadas; inicio de atendimento exige designacao |
| 15 | Encerrados nao aceitam alteracoes/comentarios | Implementado: edicao, designacao, transicoes e comentarios bloqueados em encerrados |
| 16 | Registrar instante de resolucao | Implementado: resolvidoEm preservado na reabertura e atualizado na proxima resolucao |
| 17 | Maximo de cinco atendimentos por tecnico | Implementado: limite de cinco protegido por bloqueio do tecnico e testes concorrentes de designacao/reabertura |
| 18 | Proibido atender o proprio chamado | Implementado: proibicao de autoatendimento, inclusive apos troca de perfil |
| 19 | Comentario apenas do solicitante ou responsavel | Implementado: autor deve ser solicitante ou tecnico atual, verificado com chamado bloqueado |
| 20 | Comentario nao vazio | Implementado: corpo textual obrigatorio, nao vazio apos trim |
| 21 | Comentarios imutaveis | Implementado na API: somente criacao, sem rotas de edicao/exclusao |

## Onde conferir no repositório

| Regras / funcionalidade | Código | Testes de integração |
| --- | --- | --- |
| 1–4: pessoas e histórico | [pessoas](../orm-basico/src/pessoas), [chamados](../orm-basico/src/chamados), [comentários](../orm-basico/src/comentarios) | [pessoas](../orm-basico/test/pessoas.e2e-spec.ts), [chamados](../orm-basico/test/chamados.e2e-spec.ts), [comentários](../orm-basico/test/comentarios.e2e-spec.ts) |
| 5–7: tipos de problema | [tipos de problema](../orm-basico/src/tipos-problema), [chamados](../orm-basico/src/chamados) | [tipos de problema](../orm-basico/test/tipos-problema.e2e-spec.ts), [chamados](../orm-basico/test/chamados.e2e-spec.ts) |
| 8–18: chamados | [service](../orm-basico/src/chamados/chamados.service.ts), [DTOs](../orm-basico/src/chamados/dto) | [chamados](../orm-basico/test/chamados.e2e-spec.ts) |
| 19–21: comentários | [service](../orm-basico/src/comentarios/comentarios.service.ts), [controller](../orm-basico/src/comentarios/comentarios.controller.ts) | [comentários](../orm-basico/test/comentarios.e2e-spec.ts) |
| Autenticação e permissões | [auth](../orm-basico/src/auth) | [autenticação](../orm-basico/test/auth.e2e-spec.ts) |
| CRUD do exercício inicial | [tarefas](../orm-basico/src/tarefas) | [tarefas](../orm-basico/test/tarefas.e2e-spec.ts) |

Os testes de chamados incluem as combinações de transição de situação e disputas concorrentes pelo limite de cinco atendimentos. Os de comentários incluem participação, encerramento, imutabilidade e conversa no detalhe. Os de autenticação exercitam o guard real, login, logout, expiração, permissões e falsificação de identidade no corpo HTTP.

## Como reproduzir

Após instalar as dependências, gerar o Prisma Client e configurar os bancos, execute na raiz:

```powershell
npm run build
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

O último comando exige o banco de testes e `orm-basico/.env.test` preparados conforme o [README](../README.md). A configuração possui fallback para a conexão da aplicação quando esse arquivo não existe.

Os registros anteriores da entrega informam 43 testes unitários e 165 de integração aprovados com MySQL. Esses números são um registro histórico, não uma execução automática no ambiente de quem clona o projeto. A evolução e os resultados de etapas anteriores estão no [histórico da implementação](historico-implementacao.md).
