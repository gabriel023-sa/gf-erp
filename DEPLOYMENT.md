# Publicacao do GF ERP

Este guia prepara o GF ERP para rodar em um servidor na internet com API, banco de dados, login, PWA e tempo real.

## 1. Preparar o projeto

Na pasta `gf-erp`:

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

Edite `.env`:

```env
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://gf-erp.seudominio.com.br
JWT_SECRET=use-uma-chave-longa-e-secreta
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gf_erp
DB_SSL=false
ADMIN_EMAIL=admin@gfimpressao3d.com.br
ADMIN_PASSWORD=uma-senha-forte
CORS_ORIGIN=https://gf-erp.seudominio.com.br
```

## 2. Testar localmente

Modo mais simples, sem `.env`:

```bash
npm install
npm start
```

Acesse:

```text
http://localhost:3000
```

Nesse modo, o servidor usa um banco local em arquivo:

```text
data/gf-erp.local.json
```

Para testar com PostgreSQL local e Docker Desktop, copie o ambiente local:

```bash
cp .env.development.example .env
```

Suba o PostgreSQL:

```bash
npm run db:up
```

Rode o servidor:

```bash
npm start
```

Entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

No ambiente local padrao:

- E-mail: `admin@gfimpressao3d.com.br`
- Senha: `admin123`

## 3. Banco PostgreSQL

Crie um banco PostgreSQL local, em VPS ou em um provedor gerenciado.

Exemplo:

```text
postgresql://gf_user:senha@localhost:5432/gf_erp
```

Em provedores como Render, Railway, Neon ou Supabase, copie a connection string fornecida para `DATABASE_URL`.

Se o provedor exigir SSL, use:

```env
DB_SSL=true
```

## 4. Publicar em VPS

Exemplos de VPS:

- DigitalOcean
- Hetzner
- Hostinger VPS
- AWS Lightsail
- Oracle Cloud

Passos gerais:

1. Instale Node.js 20.
2. Instale ou conecte um PostgreSQL.
3. Envie a pasta `gf-erp` para o servidor.
4. Rode `npm install --omit=dev`.
5. Configure `.env`.
6. Rode o app com PM2:

```bash
npm install -g pm2
pm2 start server/index.js --name gf-erp
pm2 save
pm2 startup
```

7. Configure Nginx como proxy reverso.

Exemplo de Nginx:

```nginx
server {
  server_name gf-erp.seudominio.com.br;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

8. Ative HTTPS com Certbot:

```bash
certbot --nginx -d gf-erp.seudominio.com.br
```

## 5. Publicar em hospedagem Node.js

Servicos possiveis:

- Render
- Railway
- Fly.io
- Heroku-like providers

Recomendacao inicial para a GF:

- Render para hospedar a aplicacao Node.js.
- Neon ou Supabase para PostgreSQL gerenciado.
- Cloudflare para DNS do subdominio `erp.gfimpressao3d.com.br`.

Configure:

- Build command: `npm install`
- Start command: `npm start`
- Environment variables: copie as variaveis do `.env.example`
- PostgreSQL: use o banco gerenciado do proprio provedor ou um banco externo

Importante: nao use armazenamento temporario para dados de producao. O GF ERP espera um PostgreSQL persistente.

## Migrações

As migracoes ficam em:

```text
server/migrations
```

Ao iniciar com `DATABASE_URL`, o servidor aplica automaticamente as migracoes ainda nao executadas e registra em `schema_migrations`.

## 6. Backup em producao

Backup minimo diario com PostgreSQL:

```bash
pg_dump "$DATABASE_URL" > backups/gf-erp-$(date +%F).sql
```

Tambem exporte JSON pelo botao `Exportar backup` dentro do sistema.

## 7. PWA em producao

Para o PWA instalar corretamente:

- Use HTTPS.
- Mantenha `manifest.webmanifest` acessivel.
- Mantenha `service-worker.js` na raiz do site.
- Teste no Chrome Android, Edge/Chrome Windows e Safari iPhone.

No iPhone, a instalacao e feita pelo botao de compartilhamento do Safari: `Adicionar a Tela de Inicio`.

## 8. Seguranca antes de liberar

- Trocar `JWT_SECRET`.
- Trocar `ADMIN_PASSWORD`.
- Usar HTTPS.
- Fazer backup automatizado.
- Restringir acesso ao servidor.
- Atualizar dependencias com frequencia.
- Criar usuarios individuais se mais pessoas acessarem.

## 9. Evolucoes recomendadas

- Criar tela de gerenciamento de usuarios.
- Criar permissao por perfil.
- Mover geracao de PDF para o servidor.
- Ativar notificacoes push.
- Integrar WhatsApp oficial.
- Integrar IA para analises financeiras e atendimento.
