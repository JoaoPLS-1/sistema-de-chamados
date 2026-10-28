# Acompanhamento das regras de negocio

Referencia: [regras originais](regras-de-negocio.md). Revisao apos o modulo de chamados.

## Situacao por regra

| Regra | Requisito | Situacao e evidencia |
| --- | --- | --- |
| 1 | E-mail valido e unico | Implementado em pessoas; testes de validacao, normalizacao e unicidade concorrente |
| 2 | Solicitante ou tecnico | Implementado com enum no banco e validacao dos DTOs |
| 3 | Inativos nao abrem, atendem ou comentam | Abertura, designacao e reabertura verificam atividade na transacao; falta integrar comentarios |
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
| 15 | Encerrados nao aceitam alteracoes/comentarios | Edicao, designacao e transicoes bloqueadas em encerrados; falta integrar comentarios |
| 16 | Registrar instante de resolucao | Implementado: resolvidoEm preservado na reabertura e atualizado na proxima resolucao |
| 17 | Maximo de cinco atendimentos por tecnico | Implementado: limite de cinco protegido por bloqueio do tecnico e testes concorrentes de designacao/reabertura |
| 18 | Proibido atender o proprio chamado | Implementado: proibicao de autoatendimento, inclusive apos troca de perfil |
| 19 | Comentario apenas do solicitante ou responsavel | Pendente: modulo de comentarios |
| 20 | Comentario nao vazio | Pendente: modulo de comentarios |
| 21 | Comentarios imutaveis | Pendente: modulo de comentarios, sem rotas de edicao/exclusao |

## Proxima etapa e pendencias

- Implementar comentarios: autor ativo, somente solicitante ou tecnico atual, corpo nao vazio,
  bloqueio de encerrados e ausencia de edicao/exclusao (regras 3, 15, 19, 20 e 21).
- Criar relacoes de comentarios com chamado e autor, protegidas por chaves estrangeiras.
- Incluir a conversa ordenada no detalhe do chamado. Essa funcionalidade ainda nao foi implementada.
- Definir identificacao/autenticacao do autor. Por enquanto, a abertura recebe solicitanteId;
  isso identifica o cadastro referenciado, sem autenticar a identidade de quem envia a requisicao.
- Manter validacoes de comentarios na mesma transacao e bloquear a linha do chamado para
  impedir comentario simultaneo ao fechamento/cancelamento.

## Revisao da entrega de chamados

- Rotas de abertura, consulta, filtros, edicao, designacao e situacao implementadas.
- Historico real de pessoas e tipos integrado; tecnicos anteriores continuam protegidos contra exclusao.
- ReadCommitted com bloqueio da linha do chamado e da pessoa protege estados e capacidade.
  Conflitos transacionais P2034 sao repetidos ate tres tentativas.
- ResolvidoEm registra a ultima resolucao; reabrir preserva o registro e resolver novamente o atualiza.
- Banco tarefas, migracao criar_chamados aplicada e diff final sem diferencas.
- Build, lint, 10 testes unitarios e 141 testes de integracao aprovados, incluindo regressao completa.
- Nenhum modulo de comentarios ou autenticacao foi apresentado como concluido.
