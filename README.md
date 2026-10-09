# USE MODA PLM

**Da ideia ao produto industrial. Em um único fluxo.**

PLM (Product Lifecycle Management) para a indústria da moda — da pesquisa de
tendências ao lançamento, com IA como estilista e o ERP como sistema
transacional. O PLM é o sistema de desenvolvimento e inteligência do produto;
estoque, fiscal, contas a pagar/receber permanecem no ERP.

```
Pesquisa → Coleção → Criação → Produto → Desenvolvimento → Engenharia
   → Aprovação → Produção → Qualidade → Lançamento → Desempenho ↺
```

---

## Stack

| Camada    | Tecnologia                                                         |
| --------- | ------------------------------------------------------------------ |
| Framework | TanStack Start + TanStack Router (file-based routing, SSR)         |
| UI        | React 19 · Tailwind 4 · Radix/shadcn · framer-motion · recharts    |
| Estado    | Zustand (stores por módulo) + TanStack Query                       |
| Backend   | Supabase (Postgres · Auth · Storage · Realtime) + server functions |
| Validação | Zod                                                                |
| Build     | Vite 7 + Nitro (preset `cloudflare-module`)                        |
| Testes    | Vitest + Testing Library (unidade) · Playwright (E2E)              |

---

## Setup

Requisitos: **Node ≥ 22.12** (o código usa APIs que exigem essa versão — com
Node 20 o `npm install` emite `EBADENGINE`) e npm ou bun.

```bash
git clone https://github.com/Implantac/plm-use.git
cd plm-use
cp .env.example .env     # preencha com as credenciais do seu projeto Supabase
npm install              # ou: bun install
npm run dev              # http://localhost:8080
```

### Variáveis de ambiente

Todas documentadas em `.env.example`. Dois pontos que causam erro em produção:

- **`VITE_*` precisa espelhar `SUPABASE_*`.** O cliente lê `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`; o servidor lê `SUPABASE_URL` e
  `SUPABASE_PUBLISHABLE_KEY`. Se divergirem, o app funciona no servidor e falha
  no navegador (ou o inverso).
- **A publishable key é pública.** Ela é embutida no bundle do navegador. Nunca
  a use como segredo de endpoint — qualquer visitante a lê no DevTools.

### Banco de dados

As migrations vivem em `supabase/migrations` (51 arquivos: schema, RLS, triggers
e RPCs) e há uma trilha paralela em `drizzle/`. Aplique com a Supabase CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

---

## Scripts

| Comando                 | O que faz                                            |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Servidor de desenvolvimento                          |
| `npm run build`         | Build de produção (cliente + SSR + Nitro)            |
| `npm run build:dev`     | Build em modo development                            |
| `npm run preview`       | Serve o build de produção                            |
| `npm run typecheck`     | `tsc --noEmit` — deve sair com 0 erros               |
| `npm run test`          | Testes unitários (Vitest)                            |
| `npm run lint`          | ESLint                                               |
| `npm run format`        | Prettier (escrita)                                   |
| `npm run security-scan` | Gera `security-report.md` (auditoria + lint + tipos) |

> **Memória no build:** o empacotamento final do Nitro passa de 1,3 GB de heap.
> Em máquinas ou runners com pouca RAM, use
> `NODE_OPTIONS="--max-old-space-size=1350" npm run build`.

### Testes E2E

Os specs em `tests/e2e/*.spec.py` são Playwright em Python e exigem configuração
própria (diferente do Vitest). Eles cobrem contratos de acessibilidade
(`role="alert"`, `aria-live`, foco após validação) e esperam o app em
`http://localhost:8080`:

```bash
pip install playwright && playwright install chromium
python tests/e2e/field-message.aria-live.spec.py
```

---

## Arquitetura

```
src/routes/            49 rotas (file-based)
  _authenticated.tsx   shell autenticado + guard de sessão
  _authenticated.*     40 telas de negócio
  api/generate-image   proxy autenticado para o gateway de IA
  api/public/cron/*    crons (HMAC-SHA256 por endpoint)

src/lib/               domínio: stores, server functions, sync
  */store.ts           13 stores Zustand
  */*.functions.ts     6 módulos de server functions (sob RLS)
  cloud-sync.ts        hidratação + upsert debounced para o Supabase
  nav/routes.ts        registro central de rotas (fonte única de navegação)

src/components/        125 componentes organizados por domínio
supabase/migrations/   schema + RLS + triggers + RPCs
.lovable/docs/         92 documentos: handbook, domínio, UX, regras de negócio
```

**Três camadas de autorização** — a regra de negócio mora onde não pode ser
burlada:

1. **Banco (RLS + funções).** 219 políticas e 53 funções `SECURITY DEFINER`.
   Operações críticas são atômicas no banco — o saldo por etapa do PCP, por
   exemplo, só muda via `register_passages`, porque validar quantidade e próxima
   etapa não pode depender do cliente.
2. **Server functions.** `requireSupabaseAuth` valida o JWT no servidor
   (`supabase.auth.getClaims`) antes de qualquer handler rodar.
3. **Interface.** A UI apenas espelha o que o banco já garante (`opPermissions`,
   por exemplo). Esconder um botão nunca é a proteção — é conveniência.

---

## Notas para quem for mexer

- **Leia `AGENTS.md`** antes de alterar fluxos de PCP ou IA: são decisões
  arquiteturais registradas com o motivo.
- **Rotas novas** devem ser registradas em `src/lib/nav/routes.ts` — a sidebar,
  o breadcrumb, a busca global e os ícones são todos gerados da registry
  (`src/lib/nav/icons.ts`). `src/lib/nav/routes.test.ts` quebra o build se uma
  rota autenticada existir no disco sem entrada na registry (exceções
  deliberadas têm de ser declaradas lá). O ícone é string-key na registry; o
  componente mora só em `icons.ts`.
- **Crons novos** em `/api/public/*` precisam de assinatura HMAC com segredo
  próprio, no padrão de `launch-performance.ts`. Endpoint público sem HMAC e
  com escrita privilegiada é vulnerabilidade, não atalho.
- **`routeTree.gen.ts` é gerado** pelo TanStack Router — não edite à mão.
- **Módulos criativos persistem via `creative-sync`** (ver
  "Módulos criativos: persistência" em Deploy). A coleção em si
  (`collections`) segue catálogo de seed estático — decisão de produto, não
  bug.

---

## Deploy

O build usa o preset `cloudflare-module` do Nitro (via
`@lovable.dev/vite-tanstack-config`), voltado ao Lovable Cloud. Para hospedar em
VPS, Docker ou outro provedor, troque o preset do Nitro para `node-server` ou
`docker` e valide `src/server.ts`.

### Variáveis obrigatórias no deploy

| Variável                                   | Onde                         | Sem ela                                              |
| ------------------------------------------ | ---------------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | servidor                     | API 500                                              |
| `SUPABASE_SERVICE_ROLE_KEY`                | só servidor (crons)          | crons 500                                            |
| `LAUNCH_CRON_SECRET`, `ABC_CRON_SECRET`    | servidor + caller do pg_cron | crons respondem **503** (falha fechada de propósito) |
| `VITE_SUPABASE_URL` + publicável espelhada | cliente                      | app não loga                                         |
| `LOVABLE_API_KEY`                          | servidor                     | IA desabilitada (503)                                |

### Agendar os crons (migration pronta — falta aplicar no projeto)

A migration `supabase/migrations/20261008203000_schedule_cloud_crons.sql` agenda
os dois jobs via `pg_cron`, com HMAC calculado no banco (`pgcrypto`) e auditoria
em `public.app_cron_runs` (o fim do "cron mudo": falhas viram linha na tabela).
O segredo e a URL **não ficam no Git** — populados uma vez por ambiente:

1. `supabase db push` (ou cole a migration no SQL editor) com as extensões
   `pg_cron`, `pg_net`, `pgcrypto` habilitadas — a migration falha alto se faltar.
2. `supabase/seed_cron_config.example.sql` → copie, preencha segredo/URL reais,
   rode **no SQL editor** (service_role). Nunca commite os valores.
3. Dispare um teste manual e confira:
   ```sql
   select public.run_cloud_cron('launch-performance');
   select job, ok, detail, started_at from public.app_cron_runs order by id desc limit 3;
   ```
4. Valide o deploy de fora com o smoke test (verifica liveness + a matriz de
   assinatura nos dois endpoints):
   ```bash
   APP_URL=https://SEU-DOMINIO LAUNCH_CRON_SECRET=... ABC_CRON_SECRET=... \
     ./scripts/smoke-cron.sh
   ```

### Health & monitoramento

`GET /api/health` responde `200 {"status":"ok"}` sem tocar banco/IA — use como
alvo de uptime externo. Alertas de negócio do cron = consultar `app_cron_runs`.

### Recuperação de senha & auto-cadastro

- **Recuperação:** `/reset-password` (link "Esqueci minha senha?" no login).
  Requer: template _Recovery_ apontando para `${SITE_URL}/reset-password` e
  essa URL na allowlist de **Redirect URLs** do Supabase Auth.
- **Auto-cadastro é desligado** por padrão. A aba "Criar conta" só aparece com
  `VITE_ALLOW_SELF_SIGNUP=true` (dev local). Em produção, o gate real é o toggle
  "Allow new sign ups" do painel Auth — mantenha-o desligado; usuários entram por
  convite do admin (Admin → Usuários).

### Módulos criativos: persistência (P0-1, fase 1)

`colors`, `prints`, `looks`, `display`, `measurements` e os filtros salvos do
`collection-map` **deixaram de ser voláteis**: `src/lib/creative-sync.ts` espelha
cada store numa tabela (`color_palettes`, `print_assets`, `looks`,
`display_boards`, `measurement_charts`, `collection_map_filters`) no mesmo padrão
de `cloud-sync.ts` — hidrata ao logar, empurra snapshot debounced (800 ms) a cada
mudança, poda linhas excluídas e usa realtime para manter abas/dispositivos em
sincronia. Chave de upsert: `external_key` (o id do store), então os seeds
("pal-01"…) viram linhas na primeira edição sem duplicar.

Requisito: aplicar a migration — `supabase db push` cria as tabelas + RLS +
realtime. Enquanto ela não estiver aplicada, o sync falha silencioso no console
(`[creative-sync] hidratação … indisponível`) e a UI funciona como antes.
Depois do push, regenere os tipos:
`supabase gen types typescript --local > src/integrations/supabase/types.ts`
(hoje `creative-sync.ts` usa um cliente tipado à mão para as tabelas novas).

O que ainda **não** é persistido (decisão pendente, fase 2): a matriz de
coleção em si (o store não tem mutators — é catálogo estático) e o catálogo de
referências do display. A normalização dos jsonb (`colors`, `items`, `points`,
`grade`…) para BI/ERP é item próprio no `TODO.md`.

---

## Licença

Projeto privado. Todos os direitos reservados.
