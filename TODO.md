# TODO

## Concluído

- [x] Drag-and-drop no Kanban de Desenvolvimento (já estava pronto; item remicado).
- [x] P0 de segurança: `/api/public/cron/abc-classify` trocou a publishable key
      por HMAC-SHA256 (`x-abc-signature` / `ABC_CRON_SECRET`); helper compartilhado
      em `src/lib/api/cron-auth.server.ts` com 8 testes de regressão.
- [x] `.env` fora do Git + `.env.example` documentado.
- [x] Guard `beforeLoad` (browser-only) no layout `_authenticated`.
- [x] `robots.txt`/`sitemap.xml` restritos ao que é público.
- [x] `scripts/security-report.js` consertado; `security-report.md` fora do Git.
- [x] `README.md` + scripts `test`/`typecheck`.
- [x] Contraste WCAG AA: token `--danger-text` (texto de erro) e botão
      desabilitado sem opacity — a spec `a11y` do próprio repo agora passa.
- [x] Agendamento real dos crons: migration `20261008203000_schedule_cloud_crons.sql`
      (pg_cron + HMAC via pgcrypto + auditoria `app_cron_runs`) +
      `supabase/seed_cron_config.example.sql` + `scripts/smoke-cron.sh`.
      **Falta aplicar no projeto** (db push + seed com segredos reais).
- [x] CI mínima: `.github/workflows/ci.yml` (prettier → eslint → tsc → vitest →
      build). Repo todo formatado (`npm run format`) + `.prettierignore` para
      vendor/minificados.
- [x] Lockfile npm regenerado (seroval 1.5.4→1.6.8; `npm audit --omit=dev`:
      crítica zero) + `engines.node >= 22.12`.
- [x] E2E com URL configurável (`PLM_E2E_BASE`) e adaptativos ao flag de signup.
- [x] Auto-cadastro desligado por padrão (`VITE_ALLOW_SELF_SIGNUP=true` reabre).
- [x] Recuperação de senha: `/reset-password` + link no login +
      `src/lib/auth-form.ts` (validação pura, 10 testes).
      **Falta configurar** template Recovery + Redirect URL no painel Supabase.
- [x] cloud-sync: pushes verificam `error` e avisam (fim do salvamento fantasma).
- [x] `/api/health` para monitoramento externo.
- [x] Screenshots de E2E fora do Git; `example.functions.ts` (getGreeting) removido.

## Pendências que exigem ação fora do repositório

- [ ] Aplicar a migration do cron no projeto real + seed do `app_cron_config`
      (segredos gerados com `openssl rand -hex 32`, iguais aos do deploy).
- [ ] Painel Supabase: "Allow new sign ups" OFF; Redirect URLs com
      `https://SEU-DOMINIO/reset-password`; testar o e-mail de recuperação.
- [ ] Projeto staging Supabase espelhado; E2E de staging com
      `PLM_E2E_BASE=https://staging...`.
- [ ] `npm audit fix --force` (majors em tooling dev) — só com CI rodando uns dias.

## Próximo — alinhar navegação ao produto (Sprint 1)

- [ ] Sidebar gerada de `src/lib/nav/routes.ts` (fonte única) em vez do
      `navSections` hardcoded (28 vs 34 caminhos).
- [ ] Decidir exposição das 13 rotas órfãs (collections, compare, collection-map,
      display, feed, financial, influencers, measurements, pieces-report,
      planner, production/today, prototypes, supplier-portal).
- [ ] Mover `/audit` (página estática interna) para fora da superfície pública.
- [ ] Renomear seções para o ciclo do produto.

## Próximo — fechar o ciclo de persistência (Sprint 2)

- [ ] Modelar e migrar os 6 stores voláteis (colors, prints, looks, display,
      measurements, collection-map) para server functions sob RLS — maior item
      restante para o mundo real.
- [ ] Substituir `pcp_lots.metadata` (Lote inteiro em jsonb) por tabelas
      normalizadas — BI e ERP dependem disso.
- [ ] Abandonar a trilha Drizzle (schema.ts vazio; 51 migrations SQL no padrão).
- [ ] Primeiro adapter ERP real (o atual devolve `Math.random()`).

## Próximo — industrializar (Sprint 3)

- [ ] Portar os 6 specs Playwright/Python para o runner do projeto (ou manter
      como job de staging no CI) e remover o duplo runner.
- [ ] Unificar package manager: `packageManager` no package.json quando o CI
      estiver verde (bun é o que o Lovable usa; hoje npm está consistente).
- [ ] Plano de desacoplamento do Lovable (gateway de IA, OAuth `cloud-auth-js`).
- [ ] Avaliar preset `node-server`/`docker` para oferta on-premise.
