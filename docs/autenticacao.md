# Autenticacao

Todas as rotas exigem `Authorization: Bearer TOKEN`, exceto `POST /auth/login`.
Nao existe cadastro publico: tecnicos mantem as pessoas do sistema.

## Primeiro acesso e pessoas existentes

Depois das migracoes e do build, execute em `orm-basico/`:

```powershell
npm run auth:criar-acesso
```

O assistente solicita nome, email, tipo (`TECNICO` para o primeiro acesso administrativo)
e senha de 8 a 128 caracteres, digitada sem aparecer no terminal. Se o email ja existe,
preserva o cadastro e o perfil e redefine somente a senha. Sessoes anteriores sao revogadas.
O comando precisa de acesso local ao `.env` e ao banco; nao e uma rota publica da API.
As migracoes preservam pessoas existentes, que precisam receber uma credencial antes de entrar.

## Rotas

| Metodo | Rota | Acesso |
| --- | --- | --- |
| POST | /auth/login | Publico, email e senha; retorna token, tipo Bearer, expiraEm e resumo da pessoa |
| GET | /auth/me | Pessoa autenticada |
| POST | /auth/logout | Pessoa autenticada; revoga o token atual e retorna 204 |
| PUT | /pessoas/:id/senha | Tecnico; recebe senha, revoga todas as sessoes do destinatario e retorna 204 |

```json
{"email":"ana@example.com","senha":"SUA_SENHA"}
```

Use o token retornado no cabecalho de todas as proximas requisicoes:

```http
Authorization: Bearer TOKEN_RETORNADO_NO_LOGIN
```

Chamados e comentarios usam a identidade da sessao. Nao envie mais `solicitanteId`
na abertura ou `autorId` no comentario: esses campos sao descartados no corpo HTTP.

```json
{"titulo":"Falha na rede","descricao":"Nao consigo acessar a rede interna","tipoProblemaId":1}
```

```json
{"corpo":"O problema persiste ao tentar acessar o sistema."}
```

## Permissoes

- Tecnicos consultam e mantem pessoas, definem senhas, mantem tipos de problema,
  consultam todos os chamados, designam tecnicos e alteram a situacao.
- Solicitantes consultam e editam apenas seus chamados e consultam tipos de problema.
- Apenas solicitantes ativos podem abrir chamados, conforme a regra original.
- Comentarios continuam restritos ao solicitante e ao tecnico atual do chamado.
- As rotas de tarefas da aula exigem autenticacao e continuam acessiveis aos dois perfis.
- Desativar uma pessoa revoga suas sessoes na mesma transacao. O perfil atual e consultado
  no banco a cada requisicao; permissoes nao ficam congeladas no token.

Dados invalidos retornam 400, credencial ou sessao invalida retorna 401, perfil sem
permissao retorna 403. Chamado de outro solicitante retorna 404. Conflitos de negocio
continuam retornando 409. O login permite 30 tentativas por IP por minuto, por instancia;
exceder o limite retorna 429.

## Armazenamento e testes

As senhas usam scrypt com salt aleatorio individual e comparacao por `timingSafeEqual`.
O token e opaco, aleatorio, dura oito horas e somente seu SHA-256 e salvo no banco.
Logout e redefinicao de senha revogam sessoes persistidas. Hashes e credenciais nao
aparecem nas respostas publicas de pessoas ou chamados.

Referencias: [Node.js crypto](https://nodejs.org/api/crypto.html) e
[guards globais no NestJS](https://docs.nestjs.com/guards).

A suite `test/auth.e2e-spec.ts` exercita o guard real, login, logout, expiracao,
inatividade, redefinicao de senha, permissoes e tentativas de falsificar o autor.
As suites das regras de negocio substituem apenas o guard para variar identidades
e continuar testando as transacoes e regras; isso nao altera o guard da aplicacao.
