# Onda 126 — Sair do Lovable: Supabase próprio + Vercel

**Motivo:** os créditos do Lovable acabaram e o banco (projeto Supabase de propriedade
do Lovable) ficou inacessível — sem SQL Editor, sem segredos, sem publicação. Um produto
para cliente piloto não pode depender disso. Esta onda entrega tudo o que o repositório
precisa para rodar em infraestrutura **sua**: banco no Supabase (conta própria, plano
gratuito serve para começar) e app na Vercel.

## O que foi provado nesta onda (no sandbox, Postgres 17 limpo)

- As **77 migrations** de `supabase/migrations` reproduzem o schema do zero: **76 passam
  direto**; a 77ª (`20261008203000_schedule_cloud_crons.sql`) só exige as extensões
  `pg_cron` e `pg_net`, que no Supabase se habilitam com um clique. Mais 2 do drizzle
  (`official_models`) completam **83 tabelas** — inclusive `integration_connections`
  da Onda 125, que fica aplicada de graça.
- O build para Vercel funciona com `NITRO_PRESET=vercel` (log: `Building [Nitro]
(preset: vercel)` → `.vercel/output/static` + `functions/__server.func`). O passo
  do servidor estourou a memória do sandbox (2 GB); a Vercel compila com 8 GB.
- Nenhuma migration tem URL/segredo do projeto antigo: os crons leem
  `app_cron_config` (tabela), e o app lê tudo de variáveis de ambiente.

## Arquivos novos

| Arquivo                                  | Para quê                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `vercel.json`                            | build na Vercel com o preset certo (`NITRO_PRESET=vercel`)               |
| `scripts/migracao/01-aplicar-schema.sh`  | aplica as migrations no Postgres novo (psql), com relatório              |
| `scripts/migracao/02-exportar-dados.mjs` | **exporta tudo do projeto antigo só com o seu login** (sem service role) |
| `scripts/migracao/03-importar-dados.mjs` | importa no projeto novo (service role), remapeando usuários              |
| `scripts/migracao/tabelas.json`          | as 82 tabelas em ordem de dependência                                    |

## Passo a passo (≈ 1 h, na sua máquina com Node 22 e psql)

### 0. Salve os dados AGORA (enquanto o app antigo ainda responde)

O app em `plmuse.lovable.app` continuava no ar nesta medição (200 e API respondendo).
O script entra com o seu e-mail/senha de admin e lê tabela por tabela + arquivos dos buckets:

```bash
PLM_URL=https://njmniwsqwohmigroswnl.supabase.co \
PLM_ANON=sb_publishable_hz_LSAvourlEw1MT0nsz-w_-O-mAH10 \
PLM_EMAIL=seu@email PLM_SENHA='sua senha' \
node scripts/migracao/02-exportar-dados.mjs ./backup
```

Guarde a pasta `backup/` (JSON por tabela, `arquivos/`, `usuarios-map.json`, `RESUMO.json`).

### 1. Supabase novo

1. supabase.com → New project (região **South America (São Paulo)**), anote a **senha do banco**.
2. Database → Extensions → habilite **pg_cron** e **pg_net** (pgcrypto já vem).
3. Connect → "Session pooler" (porta 5432) → copie a connection string e rode:
   ```bash
   DATABASE_URL='postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres' \
   bash scripts/migracao/01-aplicar-schema.sh
   ```
   Esperado: `79 aplicadas, 0 com falha` e `Tabelas em public: 83`.
4. Storage → New bucket: `use-moda-assets` (privado) e `official-models` (privado).
5. Authentication → Providers → Email: ligado; **Confirm email** desligado se quiser entrar
   sem SMTP. Authentication → URL Configuration: Site URL = `https://<seu-app>.vercel.app`
   (ajuste depois para o domínio final) e adicione a mesma URL em Redirect URLs.
6. Project Settings → API: anote `Project URL`, `anon/publishable key`, `service_role`.

### 2. Usuários e papéis

Os usuários do Auth não saem do projeto antigo (não há acesso admin lá). Crie-os de novo:
Authentication → Users → **Add user** (e-mail + senha) para cada pessoa. Depois abra
`backup/usuarios-map.json`, preencha `new_id` de cada `old_id` (o id novo aparece na
lista de usuários) e, em `"*"`, o id do admin — ele herda o que pertencia a quem não foi
recriado. Papéis (`user_roles`) são importados junto com o mapa. Se preferir, dê admin
na mão: `insert into public.user_roles(user_id, role) values ('<id>', 'admin');`.

### 3. Importar os dados

```bash
NOVO_URL=https://<ref>.supabase.co NOVO_SERVICE_ROLE='eyJ...' \
node scripts/migracao/03-importar-dados.mjs ./backup
```

O script faz upsert tabela a tabela, repete passes até resolver as FKs e sobe os arquivos
dos buckets. Linhas que sobrarem aparecem como `FALTOU <tabela>` com o motivo.

### 4. Vercel

1. vercel.com → Add New → Project → importar `Implantac/plm-use` (GitHub). Framework:
   _Other_; o `vercel.json` já define build/instalação. Node.js: **22.x**.
2. Environment Variables (Production e Preview):

   | Variável                                 | Valor                               |
   | ---------------------------------------- | ----------------------------------- |
   | `VITE_SUPABASE_URL`                      | Project URL                         |
   | `VITE_SUPABASE_PUBLISHABLE_KEY`          | anon/publishable key                |
   | `SUPABASE_URL`                           | Project URL                         |
   | `SUPABASE_PUBLISHABLE_KEY`               | anon/publishable key                |
   | `SUPABASE_SERVICE_ROLE_KEY`              | service_role (só servidor)          |
   | `WEBHOOKS_CRON_SECRET`                   | segredo longo aleatório (Onda 122)  |
   | `LAUNCH_CRON_SECRET`, `ABC_CRON_SECRET`  | idem (crons das Ondas anteriores)   |
   | `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` | quando for ligar o Bling (Onda 125) |
   | `VITE_ALLOW_SELF_SIGNUP`                 | `false` (ou omitir)                 |

3. Deploy. Depois: Supabase → Authentication → URL Configuration com a URL final.
4. Crons: `supabase/seed_cron_config.example.sql` mostra como registrar `base_url`
   (a URL da Vercel) e os segredos em `app_cron_config`; o despacho de webhooks pode ser
   agendado com `cron.schedule` chamando `POST /api/public/cron/webhooks-dispatch`.

### 5. Medir (como sempre)

- `curl -s https://<app>/` → 200 e entry `index-*.js`; `curl https://<app>/api/v1/references`
  → 401 com a mensagem em português; login → dados aparecem.
- Segurança → Chaves de API → criar uma `plm_live_…` → `GET /api/v1/references` → 200.
- `select count(*) from sales_orders;` no SQL Editor novo = `RESUMO.json`.

## O que muda ao sair do Lovable

- **IA (copiloto e geração de imagem)** usava o gateway do Lovable (`LOVABLE_API_KEY`).
  Sem a chave, as telas já explicam o motivo (Onda 90) em vez de quebrar. Trocar o
  gateway por OpenAI/Gemini direto é uma onda pequena quando quiser.
- **Login com Google** passava pelo `@lovable.dev/cloud-auth-js`; use e-mail/senha e,
  se quiser Google, configure o provider no Supabase (Authentication → Providers) e troque
  a chamada em `login.tsx` para `supabase.auth.signInWithOAuth`.
- `.env` do repo ainda aponta para o projeto antigo (só afeta dev local); a Vercel usa as
  variáveis acima. Atualize o `.env` quando o novo estiver no ar.
- A CI (`smoke-publico`) mede `plmuse.lovable.app`; aponte para a URL nova quando migrar
  (`scripts/smoke-publico.mjs`).

## Alternativa só-banco

Se preferir manter o app no Lovable por ora (créditos voltarem) e só ter o banco em
mãos: os passos 1–3 valem iguais; aí basta trocar as 5 variáveis `SUPABASE_*` no Lovable.
