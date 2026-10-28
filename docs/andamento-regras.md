# Acompanhamento das regras de negocio

Referencia: [regras originais](regras-de-negocio.md). Revisao apos o modulo de tipos de problema.

## Situacao por regra

| Regra | Requisito | Situacao e evidencia |
| --- | --- | --- |
| 1 | E-mail valido e unico | Implementado em pessoas; testes de validacao, normalizacao e unicidade concorrente |
| 2 | Solicitante ou tecnico | Implementado com enum no banco e validacao dos DTOs |
| 3 | Inativos nao abrem, atendem ou comentam | Parcial: buscarAtiva testado; integrar aos fluxos de chamados/comentarios |
| 4 | Pessoa com historico nao pode ser removida | Parcial: DELETE protegido e testado; registrar historico transacional ao criar os vinculos futuros |
| 5 | Nome de tipo de problema unico | Implementado; restricao unica no banco, validacao e testes concorrentes |
| 6 | Tipo desativado nao aceita novos chamados | Parcial: buscarAtivo testado; integrar na abertura de chamados |
| 7 | Tipo usado nao pode ser removido | Parcial: DELETE protegido e testado; registrar primeiro uso na transacao de abertura |
| 8 | Chamado nasce aberto e sem tecnico | Pendente: modulo de chamados |
| 9 | Abertura por solicitante ativo | Pendente: modulo de chamados, usando validacao de pessoa |
| 10 | Titulo de 5 a 100; descricao minima de 10 | Pendente: DTOs de chamados; as regras do CRUD didatico de tarefas sao diferentes |
| 11 | Prioridade valida, media por padrao | Pendente: modulo de chamados |
| 12 | Responsavel e um tecnico ativo | Pendente: designacao de tecnico |
| 13 | Designacao inicia atendimento | Pendente: designacao transacional |
| 14 | Somente transicoes permitidas | Pendente: maquina de estados de chamados |
| 15 | Encerrados nao aceitam alteracoes/comentarios | Pendente: chamados e comentarios |
| 16 | Registrar instante de resolucao | Pendente: transicao para resolvido |
| 17 | Maximo de cinco atendimentos por tecnico | Pendente: validar com protecao contra requisicoes simultaneas |
| 18 | Proibido atender o proprio chamado | Pendente: designacao de tecnico, mesmo se o perfil tiver mudado |
| 19 | Comentario apenas do solicitante ou responsavel | Pendente: modulo de comentarios |
| 20 | Comentario nao vazio | Pendente: modulo de comentarios |
| 21 | Comentarios imutaveis | Pendente: modulo de comentarios, sem rotas de edicao/exclusao |

## Integracoes que nao podem ser esquecidas

- Criar relacoes e chaves estrangeiras de chamados e comentarios com pessoas e tipos.
- Na abertura, verificar solicitante ativo e tipo ativo e marcar os dois historicos
  na mesma transacao da criacao. Os marcadores internos nunca devem voltar a false.
- Na designacao, verificar perfil/atividade, limite de cinco, proibicao de autoatendimento,
  marcar o historico do tecnico e realizar a transicao de estado na mesma transacao.
- Na reabertura de resolvido para atendimento, verificar novamente capacidade e atividade
  do tecnico. Registrar a decisao de negocio para o instante de resolucao ao reabrir.
- Integrar buscarAtiva/buscarAtivo ao cliente transacional ou realizar a validacao equivalente
  no proprio fluxo transacional. Uma consulta isolada nao protege contra mudancas simultaneas.
- Proteger capacidade e alteracoes de estado com bloqueios/isolamento e tratamento de concorrencia;
  testar designacoes e reaberturas simultaneas.
- Preservar historico de todos os tecnicos anteriores apos trocar o responsavel.
- Nos comentarios, validar autor ativo, participacao atual e situacao nao encerrada.
- Definir como a API identifica o autor de cada acao. O documento nao especifica autenticacao;
  nenhum modulo de autenticacao foi implementado nesta etapa.

## Revisao desta entrega

- Modulo de pessoas revisado e incluido na regressao completa; nenhuma falha encontrada.
- Tipos de problema: CRUD, ativacao/desativacao, nome unico, protecao do historico e validacao.
- Marcadores de historico so podem ser alterados internamente; os testes simulam os vinculos
  futuros pelo Prisma. As regras 3, 4, 6 e 7 ainda exigem os testes integrados de chamados.
- Banco local confirmado pelo usuario: tarefas. O destino do .env foi corrigido sem publicar credenciais.
- Migracao criar_tipos_problema aplicada e diff do banco sem diferencas em relacao ao schema.
- Build, lint, 10 testes unitarios e 62 testes de integracao aprovados.
