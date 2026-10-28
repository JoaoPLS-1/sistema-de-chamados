# Sistema de chamados

Trabalho de fixação: uma API para registrar problemas e acompanhar o atendimento de suporte, usando NestJS, TypeScript, Prisma e MySQL.

O sistema permite cadastrar pessoas e tipos de problema, abrir chamados, designar técnicos, alterar a situação e registrar comentários. Os perfis são **solicitante** e **técnico**, com login e permissões próprias.

## Por onde começar

- **Entender a proposta:** [regras de negócio](docs/regras-de-negocio.md).
- **Executar o projeto:** instruções abaixo.
- **Entender o código:** [arquitetura](docs/arquitetura.md).
- **Experimentar a API:** [requisições de exemplo](exemplos/chamados.http).
- **Conferir a implementação:** [regras e testes correspondentes](docs/andamento-regras.md).

O projeto entrega uma API HTTP, sem interface gráfica de chamados. O `index.html` é o material didático da aula; ele não é a interface da API. O módulo `/tarefas` foi mantido como parte do exercício inicial.

## Organização do repositório

```text
sistema-de-chamados/
├── orm-basico/               # Aplicação NestJS (nome do exercício original)
│   ├── src/                  # Módulos, regras, autenticação e testes unitários
│   ├── test/                 # Testes de integração com MySQL
│   ├── prisma/               # Modelo de dados e migrações SQL
│   ├── .env.example          # Modelo da conexão da aplicação
│   ├── .env.test.example     # Modelo da conexão dos testes
│   └── package.json          # Dependências e comandos da API
├── docs/                     # Regras, arquitetura e guias
├── exemplos/                 # Requisições para demonstração
├── infra/                    # Preparação do banco e primeiro acesso
├── index.html                # Roteiro da aula
└── package.json              # Atalhos para executar a API pela raiz
```

As dependências da aplicação ficam em `orm-basico/`. O `package.json` da raiz apenas encaminha comandos para essa pasta.

## Como executar

### 1. Preparar o ambiente e a conexão

Utilize MySQL 8.4 e Node.js com npm. Para uma instalação nova, use Node.js da linha 24 a partir de 24.15, compatível com os requisitos das ferramentas presentes no lockfile. Os assistentes de primeiro acesso e configuração local utilizam PowerShell no Windows.

Clone o repositório e entre na pasta:

```powershell
git clone https://github.com/JoaoPLS-1/sistema-de-chamados.git
cd sistema-de-chamados
```

Tenha um banco `tarefas` e um usuário com acesso a ele. O arquivo [infra/mysql/setup.sql](infra/mysql/setup.sql) contém um modelo de criação para executar como administrador no MySQL. Para preparar uma máquina Windows sem servidor instalado, consulte [MySQL no Windows](docs/mysql-windows.md).

Crie a configuração local somente se ela ainda não existir:

```powershell
if (-not (Test-Path orm-basico/.env)) {
    Copy-Item orm-basico/.env.example orm-basico/.env
}
```

Edite `orm-basico/.env` com a conexão do seu banco:

```dotenv
DATABASE_URL="mysql://tarefas_app:SUA_SENHA@127.0.0.1:3306/tarefas"
```

Codifique caracteres especiais da senha para URL. Os modelos têm valores fictícios; cada pessoa que executar o trabalho deve configurar suas próprias credenciais.

### 2. Instalar e preparar a API

Execute na raiz do repositório:

```powershell
npm run install:api
npm run db:migrate
npm run db:generate
npm run build
```

As migrações criam as tabelas da aplicação. O Prisma Client é gerado localmente e não precisa ser entregue no Git. Esse fluxo usa migrações já versionadas e não exige shadow database.

### 3. Criar o primeiro usuário

```powershell
npm run auth:criar-acesso
```

Escolha `TECNICO` para o primeiro usuário, que poderá manter os cadastros e definir senhas pela API. Não há conta ou senha padrão. O assistente pede nome, e-mail, perfil e senha; a senha não aparece no terminal. Para um e-mail existente, preserva o cadastro e redefine apenas a senha.

Mais detalhes em [autenticação](docs/autenticacao.md).

### 4. Iniciar

```powershell
npm run start:dev
```

A API fica em `http://localhost:3000`. A variável `PORT` permite mudar a porta. Todas as rotas exigem `Authorization: Bearer TOKEN`, exceto `POST /auth/login`.

Os comandos também podem ser executados dentro de `orm-basico/`, usando os scripts dessa pasta. Após atualizar o código, repita migrações, geração do client e build, e reinicie a API.

## Como demonstrar

Abra [exemplos/chamados.http](exemplos/chamados.http), que contém a sequência completa de requisições. Pode usar uma ferramenta que leia arquivos HTTP ou copiar as requisições para Postman, Insomnia ou outro cliente.

1. Faça login como técnico.
2. Cadastre um solicitante, defina sua senha e crie um tipo de problema.
3. Faça login como solicitante e abra um chamado.
4. Como técnico, designe a si mesmo para iniciar o atendimento.
5. Registre um comentário e consulte o detalhe para ver a conversa.
6. Resolva e feche o chamado. Tentar comentar depois do fechamento deve retornar `409`.

Use os IDs e tokens retornados pela sua execução. As requisições de exemplo não são executadas automaticamente e não contêm credenciais reais.

## Testes

Na raiz do repositório:

```powershell
npm run build
npm run lint
npm run typecheck
npm test
```

Os testes de integração usam um MySQL real. Prepare um banco separado `tarefas_teste` e conceda acesso ao usuário de testes. Há um modelo em [infra/mysql/setup-testes.sql](infra/mysql/setup-testes.sql).

Crie o arquivo local e ajuste a conexão:

```powershell
if (-not (Test-Path orm-basico/.env.test)) {
    Copy-Item orm-basico/.env.test.example orm-basico/.env.test
}
```

Depois, dentro de `orm-basico/`:

```powershell
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
npm run test:e2e
```

A configuração atual carrega `.env.test` quando ele existe; sem esse arquivo, utiliza a conexão disponível no ambiente ou no `.env`. Prepare o banco separado antes de executar a integração: os testes criam e removem seus próprios registros temporários.

A [matriz das regras](docs/andamento-regras.md) relaciona os requisitos às implementações e suítes de teste. Os registros históricos de validação estão identificados como históricos; os comandos acima permitem reproduzir a verificação.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Regras de negócio](docs/regras-de-negocio.md) | Enunciado das 21 regras |
| [Arquitetura](docs/arquitetura.md) | Módulos, fluxo das requisições e relacionamentos |
| [Regras e testes](docs/andamento-regras.md) | Situação dos requisitos e localização das evidências |
| [Autenticação](docs/autenticacao.md) | Login, permissões e primeiro acesso |
| [MySQL no Windows](docs/mysql-windows.md) | Preparação opcional do servidor local |
| [Histórico](docs/historico-implementacao.md) | Evolução do exercício e validações anteriores |

A entrega inclui código, testes, schema, migrações, lockfiles e documentação. Arquivos `.env` com credenciais, dados do banco, dependências instaladas, build e arquivos gerados ficam fora do Git.
