# Roadmap GF ERP

## Fase 1 - Estabilidade

Status: em andamento, base local validada.

- Login local funcionando.
- API local funcionando.
- Banco local em arquivo funcionando para desenvolvimento.
- Modulos antigos revisados apos migracao para backend.
- Regras de venda, caixa, estoque, contas e backup testadas.
- Projeto versionado em Git.

## Fase 2 - Banco de dados profissional

Status: preparado.

- PostgreSQL suportado via `DATABASE_URL`.
- Migrações SQL em `server/migrations`.
- Docker Compose disponivel para PostgreSQL local.
- Ambiente de producao configuravel por `.env`.

## Fase 3 - Publicar na internet

Status: preparado, depende de conta e dominio.

Hospedagem recomendada para a GF:

- Aplicacao Node.js: Render ou Railway.
- Banco PostgreSQL: Neon, Supabase, Render Postgres ou Railway Postgres.
- Dominio: `erp.gfimpressao3d.com.br`.
- HTTPS: ativado automaticamente pelo provedor ou via Cloudflare/Nginx.

## Fase 4 - Aplicativo

Status: preparado.

- PWA configurado.
- Manifest configurado.
- Service worker configurado.
- Icones GF criados.
- Instalavel em Android, Windows e iPhone quando publicado com HTTPS.

## Fase 5 - Recursos avancados

Status: proxima etapa.

- Dashboard com graficos.
- Notificacoes.
- Agenda de entregas.
- Fotos dos produtos.
- Controle de producao para impressao 3D e sublimacao.
- Integracoes futuras em `server/integrations`.
