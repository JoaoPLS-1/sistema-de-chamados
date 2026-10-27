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
A existencia do banco e usuario ainda precisa ser confirmada com autenticacao.

1. Conecte ao servidor pelo MySQL Workbench ou cliente mysql com suas credenciais.
2. Se banco e usuario ainda nao existirem, revise `infra/mysql/setup.sql`,
   substitua a senha e execute com um administrador. Se ja existirem, use os
   dados atuais; nao e necessario executar o SQL.
3. Caso ainda nao exista, copie o modelo para o arquivo local:

```powershell
Copy-Item orm-basico/.env.example orm-basico/.env
```

O `.env` local ja foi preparado com valores de exemplo. Edite-o com as
credenciais reais, preservando-o nas proximas configuracoes:

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

O servico estar ativo e a porta aberta nao confirmam a senha nem as permissoes.
A conexao autenticada ainda nao foi validada.

## Proximos passos do roteiro

O Prisma ainda nao foi instalado e a API ainda nao abre conexoes com o banco.
A `DATABASE_URL` esta preparada para os passos 3 e 4. Ao integrar o Prisma,
carregue `orm-basico/.env` e mantenha o usuario dedicado para a aplicacao.
Para `prisma migrate dev`, configure um shadow database separado e as permissoes
necessarias, sem conceder privilegios globais ao usuario da API.

A infraestrutura, os backups e a disponibilidade passam a ser responsabilidade
do servidor MySQL existente. Nenhuma instalacao ou container e necessario.
