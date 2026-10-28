# Sistema de chamados

API NestJS em `orm-basico/` e roteiro de aula em `index.html`.
A aplicacao utilizara diretamente um servidor MySQL existente.

## Estrutura

- `orm-basico/src/`: codigo da API.
- `orm-basico/.env.example`: modelo versionado da conexao.
- `orm-basico/.env`: configuracao local, ignorada pelo Git.
- `infra/mysql/setup.sql`: preparacao opcional do banco e usuario, sem Docker.

## Passo 2: preparar o MySQL existente

Nesta maquina, o servico `MySQL84` esta em execucao e a porta 3306 esta aberta.
A referencia local e `127.0.0.1:3306`, banco `tarefas`, usuario `tarefas_app`.
A conexao autenticada com o banco tarefas e o usuario tarefas_app foi validada em 27/10/2026.

1. Conecte ao servidor pelo MySQL Workbench ou cliente mysql com suas credenciais.
2. Se banco e usuario ainda nao existirem, revise `infra/mysql/setup.sql`,
   substitua a senha e execute com um administrador. Se ja existirem, use os
   dados atuais; nao e necessario executar o SQL.
3. Caso ainda nao exista, copie o modelo para o arquivo local:

```powershell
Copy-Item orm-basico/.env.example orm-basico/.env
```

O `.env` local ja contem as credenciais reais e deve ser preservado.
O exemplo abaixo serve apenas de referencia, sem expor a senha local:

```dotenv
DATABASE_URL="mysql://tarefas_app:SUA_SENHA@127.0.0.1:3306/tarefas"
```

Para outro servidor, altere host, porta, banco e usuario. Codifique caracteres
especiais da senha para URL. Nao publique o `.env` nem senhas no SQL versionado.
O usuario da API deve ter acesso somente ao banco da aplicacao.

## Validar o acesso

No Workbench, conecte com o usuario da aplicacao e execute:

```sql
SELECT CURRENT_USER(), VERSION();
USE tarefas;
SELECT 1;
```

Ou use o cliente MySQL (a senha sera solicitada sem ficar no comando):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' --protocol=TCP -h 127.0.0.1 -P 3306 -u tarefas_app -p tarefas
```

Validacao realizada em 27/10/2026: autenticacao como `tarefas_app@localhost`,
banco `tarefas`, MySQL `8.4.0` e `SELECT 1` executado com sucesso.

## Proximos passos do roteiro

Os passos 3 e 4 estao configurados: Prisma instalado, `DATABASE_URL` definida
no arquivo local `orm-basico/.env` e carregada por `orm-basico/prisma.config.ts`.
O datasource em `orm-basico/prisma/schema.prisma` usa o provider `mysql`.
O comando `node node_modules/prisma/build/index.js validate`, executado dentro
de `orm-basico/`, confirmou que a configuracao e o schema sao validos.
Os passos 5 e 6 tambem foram concluidos: modelo `Tarefa` definido, migracao
inicial aplicada ao MySQL e Prisma Client gerado em `orm-basico/src/generated/prisma`.
A integracao do Prisma com o NestJS pertence aos proximos passos do roteiro.
Para `prisma migrate dev`, configure um shadow database separado e as permissoes
necessarias, sem conceder privilegios globais ao usuario da API.

A infraestrutura, os backups e a disponibilidade passam a ser responsabilidade
do servidor MySQL existente. Nenhuma instalacao ou container e necessario.

## Passo 6: criar a tabela Tarefa

O usuario local nao tem permissao para criar o banco temporario (shadow database)
exigido por `migrate dev` (erro P3014). Como o banco estava vazio, a migracao
inicial foi gerada com `migrate diff --from-empty --to-schema prisma/schema.prisma
--script --output prisma/migrations/20261027222259_criar_tarefas/migration.sql`
e aplicada com `migrate deploy`, sem ampliar as permissoes do usuario.

Para aplicar a migracao versionada em outro banco vazio e gerar o client,
execute dentro de `orm-basico/`:

```powershell
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
```

A tabela `Tarefa` contem `id`, `titulo`, `concluida` e `criadaEm`.
Validacao: `migrate status` confirmou que o banco esta atualizado e
`migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
nao encontrou diferencas entre o banco e o schema.
O uso de `--from-empty` acima se aplica apenas a esta migracao inicial.

## Passo 14: rodar e testar

Validacao realizada em 27/10/2026 com `npm run start:dev`, executado dentro
de `orm-basico/`. A API iniciou em `http://localhost:3000` sem erros de compilacao.

O CRUD foi testado por HTTP com persistencia no MySQL:

- `POST /tarefas`: criou a tarefa `Estudar NestJS`, com status 201 e `concluida: false`.
- `GET /tarefas`: retornou status 200 e incluiu a tarefa criada.
- `GET /tarefas/:id`: retornou a tarefa com status 200.
- `PATCH /tarefas/:id`: marcou `concluida: true`, com status 200.
- Uma nova consulta confirmou que a atualizacao foi persistida.
- `DELETE /tarefas/:id`: removeu a tarefa de teste, com status 200.
- A consulta apos a remocao retornou status 404.

Foi usado o ID retornado na criacao. A tarefa de teste foi removida ao final.

## Comparando: class-validator x Zod

A API usa class-validator no POST e no PATCH, conforme o resumo final do index,
com ValidationPipe global e whitelist. O titulo deve ser texto nao vazio com
ate 191 caracteres; os erros retornam status 400 e uma lista de mensagens.

O exemplo alternativo com Zod permanece em
`orm-basico/src/tarefas/dto/criar-tarefa.schema.ts` e
`orm-basico/src/common/pipes/zod.pipe.ts`, com testes unitarios. O tipo e
inferido por `z.infer`, e o pipe usa `safeParse` e retorna os detalhes de
`error.issues` em caso de erro. Para experimentar essa alternativa no POST,
importe o schema e seu tipo (com `import type`) no controller e use
`@Body(new ZodPipe(criarTarefaSchema))`. Os dois validadores descartam campos extras.

## Testando os desafios

Testes executados em 27/10/2026 na API local em `http://localhost:3000`,
com duas tarefas temporarias no MySQL: uma pendente e outra concluida.

- `GET /tarefas?concluida=true`: status 200, somente tarefas concluidas.
- `GET /tarefas?concluida=false`: status 200, somente tarefas pendentes.
- Cada filtro incluiu a tarefa de teste correspondente e excluiu a de situacao oposta.
- `POST /tarefas` com `{"titulo":""}`: status 400 e mensagem de titulo obrigatorio.

Na versao final, o POST usa class-validator: titulo vazio retorna
`message: ["O título é obrigatório"]`.
O exemplo alternativo Zod e validado separadamente nos testes unitarios.
As duas tarefas temporarias foram removidas ao final dos testes.

## Desafio 1: descricao opcional

O modelo Tarefa inclui `descricao String? @db.Text`. POST e PATCH aceitam
`descricao` como texto ou null. Sem descricao na criacao, o banco armazena null.
No PATCH, omitir o campo preserva o valor existente; enviar null limpa o campo.
Numeros, booleanos, listas e objetos retornam 400. GET inclui descricao nos dados.

A migracao `20261027231000_adicionar_descricao` adiciona apenas a coluna
`descricao TEXT NULL` e foi aplicada ao MySQL local, preservando as tarefas.
Foi gerada com `migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
e aplicada com `migrate deploy`, evitando a exigencia de shadow database do
`migrate dev`. O Prisma Client foi atualizado e o diff final nao apontou diferencas.

Para atualizar outro ambiente, execute dentro de `orm-basico/`:

```powershell
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
npm run build
```

Exemplo de corpo para POST /tarefas:

```json
{"titulo":"Estudar NestJS","descricao":"Revisar os desafios da aula"}
```

Validacao final: build e lint aprovados, 10 testes unitarios e 18 de integracao
aprovados com MySQL. A API na porta 3000 confirmou criacao e consulta com
descricao e erro 400 para titulo vazio; a tarefa temporaria foi removida.

## Modulo de pessoas

Primeiro modulo das regras de negocio de Sistema de Chamados.
A migracao `20261027234000_criar_pessoas` cria a tabela Pessoa e foi aplicada
no MySQL local. O modelo de tarefas da aula continua disponivel.

| Metodo | Rota | Resultado |
| --- | --- | --- |
| POST | /pessoas | Cadastra uma pessoa (201) |
| GET | /pessoas | Lista pessoas por ID, incluindo inativas (200) |
| GET | /pessoas/:id | Consulta uma pessoa (200) |
| PATCH | /pessoas/:id | Atualiza campos informados (200) |
| DELETE | /pessoas/:id | Exclui pessoa sem historico de chamados (204) |

Exemplo de cadastro:

```json
{"nome":"Ana Silva","email":"ana@example.com","tipo":"SOLICITANTE"}
```

- Nome obrigatorio, sem espacos nas pontas, com ate 191 caracteres.
- E-mail obrigatorio e valido, armazenado em minusculas e sem espacos nas pontas,
  com ate 254 caracteres. A restricao unica no MySQL protege inclusive contra
  duplicidade em requisicoes simultaneas. Duplicidade retorna 409.
- Tipo obrigatorio: `SOLICITANTE` ou `TECNICO`.
- `ativa` e um booleano e assume true quando omitido no cadastro.
  Para desativar, envie `{"ativa":false}` no PATCH; para reativar, envie true.
- PATCH preserva campos omitidos. Null e tipos incorretos retornam 400.
- Campos desconhecidos sao descartados. Pessoa inexistente retorna 404.
- Respostas incluem id, nome, email, tipo, ativa, criadaEm e atualizadaEm.

### Integracao com os proximos modulos

PessoasService e exportado e oferece `buscarAtiva(id, tipo?)` para verificar
existencia, situacao ativa e, quando necessario, perfil. Inatividade ou perfil
incompativel retornam 409. Os futuros fluxos de abrir, designar e comentar
precisam executar essas verificacoes na sua operacao de negocio.

O marcador interno `temHistoricoChamados` protege a exclusao de quem ja esteve
envolvido em chamados. Nao e recebido nem exposto pela API. DELETE verifica
o marcador na propria operacao de exclusao e retorna 409 quando houver historico;
a pessoa ainda pode ser desativada. Violacao de chave estrangeira tambem retorna 409.

Ao implementar chamados e comentarios, sera necessario registrar o primeiro
envolvimento com `temHistoricoChamados: true` na mesma transacao da abertura,
designacao ou comentario e manter esse marcador mesmo apos trocar o responsavel.
As relacoes com chamados ainda serao criadas nesses modulos; o teste atual simula
o historico pelo Prisma para verificar a protecao de exclusao.

Validacao: build e lint aprovados, 10 testes unitarios e 44 de integracao aprovados,
incluindo CRUD de pessoas, normalizacao, perfis, ativacao/desativacao, validacao,
unicidade concorrente e protecao do historico. Os testes removem apenas seus
registros temporarios. O diff Prisma confirmou banco e schema sincronizados.
