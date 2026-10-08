# H3-01 · Camadas e responsabilidades

O backend do PLM tem **quatro camadas**. Nenhuma pula a outra.

## 1. Banco (Postgres + RLS)

Fonte de verdade. Regras críticas ficam aqui via constraints, triggers e
`SECURITY DEFINER` functions (`has_role`, `can_transition`).

**Nunca** confie no cliente para validar regra de negócio sensível.

## 2. Server functions (`createServerFn`)

Toda escrita e leitura sensível do PLM passa por aqui. Aplicam:

- Autorização (`requireSupabaseAuth` + `has_role`)
- Validação com Zod (`inputValidator`)
- Emissão de eventos quando trigger não cobre
- Composição de múltiplas queries

Localização: `src/lib/**/*.functions.ts` — nunca em `src/server/`.

## 3. Server routes (`src/routes/api/public/*`)

Só para chamadas externas: webhooks, cron, integração ERP síncrona.
Verificar assinatura antes de qualquer escrita.

## 4. Cliente (React + TanStack Query)

Renderiza. Nunca decide. Nunca calcula preço, custo, disponibilidade,
permissão. Nunca `supabase.from('entity_events').insert(...)` — o servidor
faz via trigger.

## Regra do fluxo

`UI → hook → server fn (auth+zod) → supabase (RLS) → trigger → event`

Se pular alguma etapa, o PR volta.
