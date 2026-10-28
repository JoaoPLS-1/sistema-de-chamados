# MySQL local no Windows

O projeto usa MySQL 8.4 LTS, sem Docker. Para preparar uma maquina nova, abra
um PowerShell como administrador na raiz do repositorio:

```powershell
winget install --id Oracle.MySQL --exact --version 8.4.9 --source winget --silent --accept-package-agreements --accept-source-agreements
powershell -NoProfile -ExecutionPolicy Bypass -File infra/mysql/configurar-local.ps1
```

Confirme as solicitacoes de permissao do Windows. O segundo comando:

- Registra o servico automatico `SistemaChamadosMySQL84`, acessivel em `127.0.0.1:3306`.
- Cria `tarefas` para a aplicacao e `tarefas_teste` para os testes.
- Cria `tarefas_app`, com acesso somente a esses dois bancos.
- Gera senhas aleatorias, sem exibi-las, e grava `orm-basico/.env` e `.env.test`, ignorados pelo Git.
- Guarda dados, logs, `my.ini` e `root-client.ini` em `%LOCALAPPDATA%\SistemaChamados\mysql`,
  com acesso restrito ao usuario, administradores e SYSTEM.
- Recusa sobrescrever um `.env`, `.env.test`, diretorio de dados ou servico existente.

O servidor e inicializado sem rede e recebe a senha root antes de aceitar conexoes.
O SQL temporario com as senhas e removido ao terminar. O acesso administrativo local
usa `root-client.ini`; a API usa apenas `tarefas_app`.

Referencia: [inicializacao do MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/data-directory-initialization.html).

## Aplicar migracoes e validar

Dentro de `orm-basico/`:

```powershell
npm ci
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
npm run build
npm run lint
npm test
```

Prepare tambem o banco de testes usando a conexao de `.env.test`, sem imprimir a senha:

```powershell
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
npm run test:e2e
```

Os testes de integracao carregam `.env.test` quando o arquivo existe. Em ambientes
antigos sem esse arquivo, usam a conexao existente; cada suite remove somente os
registros temporarios que criou. Prefira configurar o banco de testes separado.

Crie o primeiro acesso seguindo [autenticacao](autenticacao.md) e inicie a API com
`npm run start:dev`. O servidor ja sobe autenticado; envie Bearer nas requisicoes.

## Conferir o servico

```powershell
Get-Service SistemaChamadosMySQL84
Test-NetConnection 127.0.0.1 -Port 3306
```

Para iniciar ou parar o servico, em PowerShell como administrador:

```powershell
Start-Service SistemaChamadosMySQL84
Stop-Service SistemaChamadosMySQL84
```

Para utilizar um servidor MySQL existente, configure o `.env` com a conexao desse servidor, aplique as migracoes, gere o client e execute o build. O script de instalacao acima e opcional e recusa sobrescrever configuracoes existentes.
