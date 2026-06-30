# Roadmap GF ERP

## Fase 1 - Estabilidade

Status: em andamento, base local validada com controle de acesso.

- Login local funcionando.
- API local funcionando.
- Banco local em arquivo funcionando para desenvolvimento.
- Modulos antigos revisados apos migracao para backend.
- Regras de venda, caixa, estoque, contas e backup testadas.
- Projeto versionado em Git.
- Sprint 5 adicionou usuarios, perfis, permissoes e auditoria.
- Senhas sao armazenadas com hash `bcrypt`.
- Backend bloqueia alteracoes sem permissao e usuario inativo nao acessa.
- Sprint Final adicionou identidade da empresa, tema visual, login personalizado, menu agrupado, busca global e PDFs personalizados.

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

Status: preparado e refinado.

- PWA configurado.
- Manifest configurado.
- Service worker configurado.
- Icones GF criados.
- Instalavel em Android, Windows e iPhone quando publicado com HTTPS.
- Aviso de nova versao disponivel apos deploy.
- Experiencia responsiva validada em celular.

## Fase 5 - Recursos avancados

Status: em andamento.

- Dashboard com graficos concluido.
- Fotos dos produtos concluido.
- Controle de producao para impressao 3D e sublimacao concluido.
- Modulo IA CFO concluido com regras internas.
- Modulo vendedores e comissoes concluido.
- Modulo usuarios/permissoes concluido.
- Personalizacao da empresa e tema concluida.
- Busca global concluida.
- PDFs personalizados concluidos.
- Notificacoes.
- Agenda de entregas.
- Integracoes futuras em `server/integrations`.
