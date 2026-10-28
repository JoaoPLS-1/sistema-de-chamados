# Sistema de chamados

API de suporte interno construída com NestJS, TypeScript, Prisma e MySQL. Permite manter pessoas e tipos de problema, abrir chamados, designar técnicos, acompanhar situações e registrar a conversa do atendimento.

As 21 [regras de negócio](docs/regras-de-negocio.md) possuem implementação nos quatro módulos, com autenticação integrada. As evidências por regra estão em [acompanhamento das regras](docs/andamento-regras.md).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `orm-basico/src/` | API, validações, autenticação e testes unitários |
| `orm-basico/test/` | Testes de integração com MySQL |
| `orm-basico/prisma/` | Schema e migrações versionadas |
| `orm-basico/.env.example` | Modelo de configuração sem credenciais reais |
| `infra/` | Scripts de preparação do MySQL e primeiro acesso |
| `docs/` | Regras, autenticação, configuração e histórico |
| `index.html` | Roteiro didático da aula |

O módulo `/tarefas` da aula continua disponível. Os comandos da API devem ser executados em `orm-basico/`, que possui seu próprio `package.json` e `package-lock.json`.

## Requisitos

- Node.js compatível com as dependências: `^20.19`, `^22.12` ou `>=24.0`.
- npm.
- MySQL disponível e credenciais com acesso ao banco da aplicação.
- PowerShell para os assistentes locais em `infra/`.

## Preparar e executar

### 1. Configurar o banco

Para uma máquina nova no Windows, siga [configuração do MySQL](docs/mysql-windows.md). Se já existe um servidor, utilize-o e preserve os arquivos locais de configuração.

Na raiz do repositório, crie o `.env` somente se ainda não existir:

```powershell
if (-not (Test-Path orm-basico/.env)) {
    Copy-Item orm-basico/.env.example orm-basico/.env
}
```

Edite `orm-basico/.env` com a conexão real:

```dotenv
DATABASE_URL="mysql://tarefas_app:SUA_SENHA@127.0.0.1:3306/tarefas"
```

Codifique caracteres especiais da senha para URL. O `.env` é local e ignorado pelo Git. O SQL opcional `infra/mysql/setup.sql` serve para preparar banco e usuário; revise-o antes de executar e mantenha as senhas reais fora dos arquivos versionados.

### 2. Instalar dependências e aplicar migrações

```powershell
cd orm-basico
npm ci
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
npm run build
```

`migrate deploy` aplica as migrações versionadas. `generate` atualiza o Prisma Client local, inclusive após um pull com alterações no schema. O fluxo usa o MySQL existente e dispensa shadow database; criar novas migrações com `migrate dev` exige preparação específica desse banco temporário.

### 3. Criar o primeiro acesso

```powershell
npm run auth:criar-acesso
```

Use o perfil `TECNICO` para o primeiro acesso administrativo. O assistente solicita a senha sem exibi-la. Pessoas existentes também precisam receber uma senha; ao informar um e-mail já cadastrado, o assistente preserva o perfil e redefine a senha, revogando as sessões anteriores.

Veja [autenticação e permissões](docs/autenticacao.md) para os detalhes e a definição de senhas pela API.

### 4. Iniciar a API

```powershell
npm run start:dev
```

Endereço padrão: `http://localhost:3000`. A variável `PORT` permite alterar a porta.

Para atualizar uma instalação após um pull, repita a etapa 2 e reinicie a API. Crie novas credenciais quando necessário.

## Autenticação e uso

Todas as rotas exigem `Authorization: Bearer TOKEN`, exceto `POST /auth/login`. O login recebe:

```json
{"email":"ana@example.com","senha":"SUA_SENHA"}
```

O token retornado dura oito horas. Técnicos mantêm os cadastros e o atendimento; solicitantes consultam e editam seus próprios chamados. Apenas solicitantes ativos podem abrir chamados.

| Método | Rota | Ação |
| --- | --- | --- |
| POST | `/auth/login` | Autenticar |
| GET | `/auth/me` | Consultar a identidade autenticada |
| POST | `/auth/logout` | Encerrar a sessão atual |
| PUT | `/pessoas/:id/senha` | Definir senha e revogar sessões da pessoa |
| POST, GET | `/pessoas` | Cadastrar e listar pessoas |
| GET, PATCH, DELETE | `/pessoas/:id` | Consultar, atualizar ou remover pessoa sem histórico |
| POST, GET | `/tipos-problema` | Cadastrar e listar tipos de problema |
| GET, PATCH, DELETE | `/tipos-problema/:id` | Consultar, atualizar ou remover tipo sem histórico |
| POST, GET | `/chamados` | Abrir e listar chamados |
| GET, PATCH | `/chamados/:id` | Consultar detalhes com a conversa ou editar campos |
| PATCH | `/chamados/:id/tecnico` | Designar ou trocar o técnico |
| PATCH | `/chamados/:id/situacao` | Executar uma transição permitida |
| POST | `/chamados/:chamadoId/comentarios` | Registrar comentário |

Exemplo de abertura, autenticado como solicitante e com um tipo de problema ativo:

```json
{"titulo":"Falha na rede","descricao":"Não consigo acessar a rede interna","tipoProblemaId":1,"prioridade":"MEDIA"}
```

O solicitante vem da sessão. Para comentar, envie apenas o corpo:

```json
{"corpo":"O problema continua ao tentar acessar o sistema."}
```

O autor também vem da sessão. IDs de solicitante ou autor enviados no corpo são ignorados.

A listagem aceita filtros combinados: `situacao`, `prioridade`, `tipoProblemaId` e `tecnicoId`. O fluxo principal é `ABERTO → EM_ATENDIMENTO → RESOLVIDO → FECHADO`, com reabertura de resolvidos e cancelamento de abertos ou em atendimento. Chamados encerrados não podem ser alterados; comentários não possuem edição ou exclusão.

## Verificação e testes

Dentro de `orm-basico/`:

```powershell
npm run build
npm run lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm test
```

Para os testes de integração, prepare um banco separado, por exemplo `tarefas_teste`, e um arquivo local `.env.test` com `DATABASE_URL` apontando para ele. O usuário dessa conexão precisa ter acesso ao banco de testes. Aplique as migrações e execute:

```powershell
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
npm run test:e2e
```

A suíte carrega `.env.test` quando ele existe; sem esse arquivo, usa a conexão disponível no ambiente ou no `.env`. Configure o banco separado antes de executar os testes de integração, que criam e removem registros temporários.

Para conferir migrações e diferenças entre o banco da aplicação e o schema:

```powershell
node node_modules/prisma/build/index.js migrate status
node node_modules/prisma/build/index.js migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Os resultados registrados da entrega estão em [acompanhamento das regras](docs/andamento-regras.md). Execute as verificações no ambiente utilizado para confirmar o estado local.

## O que versionar

| Incluir no commit | Manter local / ignorado |
| --- | --- |
| Código, DTOs e testes | `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo` |
| Schema e migrações SQL do Prisma | Prisma Client gerado em `orm-basico/src/generated/prisma/` |
| `package.json` e `package-lock.json` | `.env`, `.env.test` e demais arquivos `.env.*` com dados locais |
| `.env.example` com valores fictícios | Credenciais, tokens e dados do banco |
| Documentação e scripts sem segredos | Skills instaladas localmente em `orm-basico/.agents/skills/`, seus atalhos em `.claude/skills/` e `.windsurf/skills/`, e `orm-basico/skills-lock.json` |

Aplicar migrações, gerar o client e cadastrar pessoas altera o ambiente local; essas operações não criam, por si só, mudanças de código para commitar. As migrações já versionadas devem permanecer no repositório.

Confira os arquivos selecionados antes do commit:

```powershell
git status --short
git diff
git diff --cached
```

## Documentação complementar

- [Regras de negócio](docs/regras-de-negocio.md)
- [Acompanhamento das 21 regras e evidências](docs/andamento-regras.md)
- [Autenticação e primeiro acesso](docs/autenticacao.md)
- [MySQL no Windows e banco de testes](docs/mysql-windows.md)
- [Histórico da implementação e validações anteriores](docs/historico-implementacao.md)
