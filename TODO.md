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

- [ ] Aplicar as migrations pendentes no projeto real (`supabase db push`):
      agendamento dos crons + 6 tabelas dos módulos criativos — e no cron, o seed
      do `app_cron_config` (segredos gerados com `openssl rand -hex 32`, iguais
      aos do deploy). Depois, `supabase gen types` e `scripts/smoke-cron.sh`.
- [ ] Painel Supabase: "Allow new sign ups" OFF; Redirect URLs com
      `https://SEU-DOMINIO/reset-password`; testar o e-mail de recuperação.
- [ ] Projeto staging Supabase espelhado; E2E de staging com
      `PLM_E2E_BASE=https://staging...`.
- [ ] `npm audit fix --force` (majors em tooling dev) — só com CI rodando uns dias.

## Alinhar navegação ao produto (Sprint 1) — feito 09/10

- [x] Sidebar gerada de `src/lib/nav/routes.ts` (fonte única) — o
      `navSections` hardcoded (28 dos 34+ caminhos) saiu; a registry ganhou as
      6 rotas que só existiam na sidebar (flow, approvals, official-models,
      launch, showroom, audit) e ícones mapeados (`nav/icons.ts`).
- [x] Órfãs resolvidas com política + teste de deriva (`nav/routes.test.ts`):
      toda rota autenticada precisa estar na registry; exceções deliberadas
      documentadas — `compare` e `production/today` são subviews dos pais.
- [x] `/audit` movida para baixo do layout `_authenticated` (antes era
      pública em `src/routes/audit.tsx`; URL preservada, login obrigatório).
- [x] Seções = ciclo do produto (`NAV_GROUPS`: Criação → Coleção → Engenharia
      → PCP → Supply → GTM → Insights → Admin); chave do estado expandido na
      sidebar bumpada para `v4`.

## Próximo — fechar o ciclo de persistência (Sprint 2)

- [x] Modelar e migrar os 6 stores voláteis (colors, prints, looks, display,
      measurements, collection-map) — fase 1: `creative-sync.ts` espelhando cada
      store em tabela com RLS + realtime (`external_key` como chave de upsert).
      **Falta aplicar `supabase db push` e validar no staging.** Fase 2 (aberta):
      normalizar os jsonb aninhados e persistir a matriz do collection-map.
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
