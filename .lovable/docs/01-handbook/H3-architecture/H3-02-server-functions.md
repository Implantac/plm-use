# H3-02 · Server functions vs server routes vs edge functions

Três formas de rodar código no servidor. Escolher errado gera bug sutil.

## `createServerFn` (padrão)

Use para **toda** lógica interna que a UI chama: leituras, escritas,
transições de workflow, chamadas ao ERP mediadas, geração de PDF, etc.

- Import: `import { createServerFn } from '@tanstack/react-start'`
- Auth: `.middleware([requireSupabaseAuth])`
- Validação: `.inputValidator(z.object(...).parse)`
- Env vars: ler `process.env.*` **dentro** do `.handler()`
- Localização: `src/lib/**/*.functions.ts`

## Server routes (`src/routes/api/public/*`)

Só para **entradas externas**:

- Webhook ERP → verificar HMAC antes de escrever
- Cron pg_cron ou scheduler externo
- Callback OAuth de terceiros

Nunca use como "API interna" — a UI deve chamar server function.

## Supabase Edge Functions

**Não usar** para lógica de app. Reservadas para:

- Webhooks que precisam entrar na rede do Supabase
- Jobs disparados por trigger de banco (`pg_net`)

Se está criando `supabase/functions/<x>/index.ts` para algo que a UI chama:
está errado, migre para `createServerFn`.

## Regras cruzadas

- Server fn com `requireSupabaseAuth` **nunca** roda em loader de rota pública
  (SSR não tem sessão → 401 no build). Chamar do componente via
  `useServerFn` ou colocar rota sob `_authenticated/`.
- Nunca importar `client.server.ts` (admin) no topo de arquivo importado
  pelo cliente. Usar `await import(...)` dentro do handler.
- Nunca ler `SUPABASE_SERVICE_ROLE_KEY` no topo de módulo compartilhado.
