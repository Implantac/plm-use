# H6-05 · Webhooks e cron

Entradas externas assíncronas.

## Webhooks

- Localização: `src/routes/api/public/webhooks/<origem>.ts`.
- **Primeira linha**: verificar assinatura HMAC (`timingSafeEqual`).
- Segunda: validar payload com Zod.
- Terceira: se escrita → `supabaseAdmin` via `await import(...)`.
- Sempre responder rápido (< 3s). Trabalho pesado vai para fila/trigger.

## Cron

- pg_cron para jobs internos ao banco (agregações, purge).
- Scheduler externo (Cloudflare Cron, Upstash) chama
  `/api/public/cron/<nome>` com header secreto compartilhado.
- Handler valida secret via `timingSafeEqual`, executa, retorna 200.

## URLs estáveis

- Preview: `project--<id>-dev.lovable.app`
- Prod: `project--<id>.lovable.app`
  Usar essas URLs em pg_cron e serviços externos — não mudam no rename.

## Idempotência

- Guardar `webhook_id` em tabela `webhook_deliveries(id, source, external_id UNIQUE, received_at, payload_hash)`.
- Se já existe → responder 200 sem reprocessar.

## Anti-padrões

- Retornar 200 antes de validar assinatura (aceita spoof).
- Reprocessar sem checar `external_id`.
- Cron chamando função pesada síncrona que bloqueia > 30s.
- Secret de cron em query string.
