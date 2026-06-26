# GF ERP

Sistema web da GF Impressao 3D com dashboard financeiro, vendas, clientes, produtos, estoque, caixa, contas, orcamentos, relatorio mensal, login, API, banco de dados e PWA.

## O que mudou nesta versao

- O frontend continua simples em HTML, CSS e JavaScript.
- Os dados sairam do `localStorage` e agora ficam em banco PostgreSQL.
- O sistema possui API Node.js.
- O acesso exige login e senha.
- Varios dispositivos logados compartilham os mesmos dados.
- Atualizacoes sao enviadas em tempo real por WebSocket.
- O app pode ser instalado como PWA no Android, Windows e iPhone.
- PostgreSQL possui migrações versionadas em SQL.
- A estrutura ja possui pontos para futuras integracoes com WhatsApp, PDF no servidor, notificacoes e inteligencia artificial.

## Requisitos

- Node.js 20 ou superior
- NPM
- PostgreSQL 14 ou superior, local ou hospedado
- Docker Desktop, opcional para rodar PostgreSQL localmente
- Um servidor com HTTPS para producao

## Instalar localmente

1. Abra a pasta `gf-erp`.
2. Instale dependencias:

```bash
npm install
```

3. Rode o sistema:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:3000
```

Sem `.env`, o GF ERP usa um banco local de desenvolvimento em:

```text
data/gf-erp.local.json
```

Login local padrao:

- E-mail: `admin@gfimpressao3d.com.br`
- Senha: `admin123`

## Usar PostgreSQL local com Docker

1. Copie `.env.development.example` para `.env`.
2. Suba o PostgreSQL:

```bash
npm run db:up
```

3. Rode:

```bash
npm run dev
```

## Configurar producao

1. Copie `.env.example` para `.env`.
2. Edite o `.env` e troque:
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `DATABASE_URL`
   - `PUBLIC_URL`
   - `CORS_ORIGIN`
3. Rode com `npm start`.

## Login inicial

O usuario inicial vem das variaveis:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Se `ADMIN_PASSWORD` nao for configurada, o servidor cria temporariamente a senha `admin123`. Isso e apenas para desenvolvimento.

## Banco de dados

O banco padrao e PostgreSQL. Configure a conexao em:

```text
DATABASE_URL=postgresql://usuario:senha@host:5432/gf_erp
```

O banco guarda:

- usuarios
- estado principal do ERP
- log simples de auditoria

## Backup

Existem dois tipos de backup:

- Backup pelo sistema: botao `Exportar backup`, que baixa um JSON dos dados.
- Backup do banco: use `pg_dump` ou o backup automatico do provedor PostgreSQL.

Antes de atualizar ou trocar de servidor, faca os dois backups.

## PWA

O GF ERP possui:

- `manifest.webmanifest`
- `service-worker.js`
- icones em `icons/`
- botao `Instalar app` quando o navegador permitir

Para instalacao real em celular, publique com HTTPS. Em iPhone, use o menu do Safari e escolha `Adicionar a Tela de Inicio`.

## Tempo real

O sistema usa WebSocket em:

```text
/ws
```

Quando um dispositivo salva dados, os outros dispositivos logados recebem a atualizacao automaticamente.

## API

Principais rotas:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/data`
- `PUT /api/data`
- `POST /api/admin/seed`
- `GET /api/admin/users`
- `POST /api/admin/users`

Rotas protegidas usam:

```text
Authorization: Bearer TOKEN
```

## Publicar

Veja o guia completo em:

- `DEPLOYMENT.md`

## Estrutura

- `index.html`: interface principal
- `styles.css`: identidade visual e responsividade
- `app.js`: frontend, regras de negocio, API e tempo real
- `manifest.webmanifest`: instalacao PWA
- `service-worker.js`: cache basico do app
- `server/index.js`: API, autenticacao, banco PostgreSQL e WebSocket
- `server/initial-data.js`: dados iniciais
- `server/migrations/`: migracoes SQL do PostgreSQL
- `server/integrations/`: base para futuras integracoes
- `.env.example`: variaveis de ambiente
- `.env.development.example`: ambiente local com PostgreSQL via Docker
- `docker-compose.yml`: PostgreSQL local para desenvolvimento
- `ROADMAP.md`: fases do projeto ate producao

## Checklist rapido de operacao

- Configure `.env`.
- Rode `npm install`.
- Rode `npm start`.
- Acesse com o usuario admin.
- Altere a senha inicial.
- Publique com HTTPS.
- Programe backup do PostgreSQL.
