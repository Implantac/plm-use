# TODO

## Concluído

- [x] Drag-and-drop no Kanban de Desenvolvimento (já estava pronto; item remicado).
- [x] P0 de segurança: `/api/public/cron/abc-classify` trocou a publishable key
      por HMAC-SHA256 (`x-abc-signature` / `ABC_CRON_SECRET`); helper compartilhado
      em `src/lib/api/cron-auth.server.ts` com 8 testes de regressão.
- [x] `.env` fora do Git + `.env.example` documentado. _(09/10: o Lovable passou a
      versionar o `.env` público dele — contrato em `AGENTS.md`; segredos locais
      de servidor vivem em `.env.local`, que continua ignorado.)_
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
- [x] `/collections** deixaram de ser voláteis (09/10, "mundo real" v2): a tela
tinha CRUD inteiro em `useState` local — ganhou store mutável + hook
(`collections/store.ts`), migration `20261009120000_persist_collections.sql`    e virou o 7º módulo do`creative-sync` (`__internals` exported para teste;
      engine coberta por 5 testes com client fake; KPIs demo viraram opcionais —
      coleção do usuário mostra "—", não número inventado).
- [x] Upload de assets validado (`storage/assets.ts`): tamanho ≤ 15 MB, allowlist
      de MIME com extensão coerente, e `folder` do caminho de storage passou por
      whitelist (era string livre do cliente). 7 testes.
- [x] Rate-limit nos crons públicos (`checkCronRateLimit`): token bucket por
      escopo+IP após HMAC, 429 + `Retry-After`. Escopo documentado: por isolate,
      proteção contra laço de agendamento — não é WAF. 4 testes.

## Pendências que exigem ação fora do repositório

- [ ] Aplicar as migrations pendentes no projeto real (`supabase db push`):
      agendamento dos crons + 7 tabelas dos módulos criativos — e no cron, o seed
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

- [x] Modelar e migrar os stores voláteis (colors, prints, looks, display,
      measurements, collection-map + collections em 09/10) — fase 1:
      `creative-sync.ts` espelhando cada store em tabela com RLS + realtime
      (`external_key` como chave de upsert).
      **Falta aplicar `supabase db push` e validar no staging.** Fase 2 (aberta):
      normalizar os jsonb aninhados; KPIs de coleção vindos de fonte real (ERP/BI).
- [ ] Substituir `pcp_lots.metadata` (Lote inteiro em jsonb) por tabelas
      normalizadas — BI e ERP dependem disso.
- [ ] Abandonar a trilha Drizzle (schema.ts vazio; 51 migrations SQL no padrão).
- [ ] Primeiro adapter ERP real (o atual devolve `Math.random()`).

## Industrializar (Sprint 3) — feito 09/10

- [x] Runner E2E único: `scripts/run-e2e.sh` (+ `npm run test:e2e`) assume
      venv/chromium/health-check e roda os 6 specs; na CI é job opt-in
      `e2e-staging` via `workflow_dispatch` com `PLM_E2E_BASE` (PR não depende
      de ambiente Supabase). Verificado rodando o script inteiro (6/6, exit 0).
- [x] Package manager: **sem `packageManager` pin** — decisão do dono
      (09/10): o build da plataforma é bun/Lovable e o campo podia contrariá-lo.
      `package-lock.json` segue sendo o registro da CI (com fallback
      `npm install` no step de install para tolerar drift dos commits do bot).
- [x] ~~Plano de desacoplamento do Lovable~~ **retirado por decisão do dono**:
      o sistema permanece no Lovable; push na `main` do GitHub é o elo oficial
      (sync bidirecional já ativo — 1100+ commits do bot). No lugar do plano:
      `docs/github-lovable-sync.md` (regras de convivência + loop de trabalho)
      e as convenções gravadas no `AGENTS.md` para o agente do editor.
- [x] ~~Preset on-premise (`node-server`/`docker`)~~ **não seguir**: a trilha
      auto-hospedada contraria a decisão acima; análise técnica arquivada na
      conversa da sessão de 09/10.
