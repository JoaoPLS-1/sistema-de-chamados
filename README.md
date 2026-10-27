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
