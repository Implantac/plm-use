# Onda 122 — Webhooks assinados + escrita vinda do ERP

**Dor:** com a API v1 (Onda 121) o ERP/loja conseguia _ler_ o PLM, mas só
perguntando de tempos em tempos; e nada voltava do ERP para o PLM (o número
da OP no ERP, o status real do chão de fábrica). Integração de verdade é
**empurrar eventos** e **aceitar a resposta do outro sistema**.

## O que ficou pronto

| Peça                                                                                                                                                           | Onde                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Tabelas `webhook_subscriptions` (URL, segredo HMAC, eventos, ativo) e `webhook_deliveries` (fila com tentativas/backoff), RLS admin/manager                    | `supabase/migrations/20261123120000_webhooks.sql`                         |
| `webhook_enqueue()` + **triggers no banco** em `sales_orders`, `production_orders`, `tech_sheets` — dispara para qualquer caminho de gravação (tela, API, ERP) | idem                                                                      |
| Catálogo de eventos + validação anti-SSRF da URL (puro, seguro no navegador)                                                                                   | `src/lib/api/webhooks-eventos.ts`                                         |
| Assinatura `X-PLM-Signature: t=…,v1=hmac_sha256(secret, t.corpo)`, verificação, backoff 1 min → 12 h (6 tentativas)                                            | `src/lib/api/webhooks.ts`                                                 |
| Despachante (`despacharPendentes`): POST com timeout 10 s, marca entregue/reagenda/falha, grava último status na assinatura                                    | `src/lib/api/webhooks.server.ts`                                          |
| Cron público assinado `POST /api/public/cron/webhooks-dispatch` (`WEBHOOKS_CRON_SECRET`, header `x-webhooks-signature`)                                        | `src/routes/api/public/cron/webhooks-dispatch.ts`                         |
| Server fns: listar, criar (segredo exibido **uma vez**), pausar/ativar, excluir, **Testar** (ping imediato), **Enviar pendentes agora**, entregas recentes     | `src/lib/api/webhooks.functions.ts`                                       |
| Card "Webhooks" em `/security`                                                                                                                                 | `src/components/security/WebhooksCard.tsx`                                |
| **Escrita do ERP:** `PATCH /api/v1/production-orders/{id ou número}` — `status`, `erp_op_id`, `planned_start/end`, `notes`; exige chave com escopo `write`     | `src/routes/api/v1/production-orders.$id.ts`, `src/lib/api/escrita-v1.ts` |
| Escopo `write` ao criar chave (checkbox) + coluna "Escopo" na lista                                                                                            | `ChavesApiCard.tsx`, `api-keys.functions.ts`                              |
| OpenAPI: path PATCH documentado + seção `x-webhooks`                                                                                                           | `recursos-v1.ts`                                                          |
| Trava (7 testes, inclui **despacho real** contra servidor HTTP local com assinatura verificada)                                                                | `src/lib/api/webhooks.test.ts`                                            |

### Eventos

`sales_order.created`, `sales_order.status_changed`, `production_order.created`,
`production_order.status_changed`, `tech_sheet.created`, `tech_sheet.updated`, `ping`.

### Corpo entregue

```json
{
  "id": "<delivery uuid>",
  "event": "production_order.status_changed",
  "created_at": "…",
  "api_version": "1",
  "data": {
    "id": "…",
    "number": "OP-0042",
    "from": "planejada",
    "to": "em_producao",
    "erp_op_id": null
  }
}
```

Headers: `X-PLM-Signature`, `X-PLM-Event`, `X-PLM-Delivery` (idempotência).

### Verificar a assinatura (receptor)

```
esperado = hex(hmac_sha256(secret, f"{t}.{corpo_bruto}"))   # t vem do header
aceitar se esperado == v1 e |agora - t| ≤ 300 s
```

## Provas

- vitest: assinatura válida/ inválida/ expirada; backoff; SSRF bloqueado
  (`localhost`, `10.x`, `169.254.169.254`); **despacho real**: servidor HTTP local
  recebeu POST com `X-PLM-Signature` válida e corpo idêntico ao esperado →
  `delivered`/200; receptor 500 → `pending` reagendado com `last_error: "HTTP 500"`;
  6ª tentativa → `failed`; assinatura pausada → falha sem chamar a URL.
- Local (vite): `PATCH` sem chave → 401; com chave sem banco → 503; cron sem
  segredo → 503; `openapi.json` inclui `patch` e `x-webhooks`.
- Card em Segurança: `auditoria/webhooks122-local-card.png`;
  chaves com escopo: `auditoria/api122-local-card-chaves-escopo.png`.

## Prova ponta a ponta em produção (24/11/2026)

Usuário cadastrou `https://webhook.site/cfec6e8e-…` em Segurança → Webhooks e clicou
**Testar** duas vezes. Conferido pela API do webhook.site (`/token/…/requests`): **2 POSTs**
às 20:42:45 e 20:43:11 UTC, headers `x-plm-event: ping` e `x-plm-signature: t=…,v1=…`,
corpo `{"id":"aba90f0d-…","event":"ping","created_at":"…","data":{"mensagem":"Teste enviado
de Segurança → Webhooks",…},"api_version":"1"}`. Primeira entrega real do PLM para um
sistema externo.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **vitest 1010/1010 (179 arquivos)**.

## Pendente para funcionar em produção

1. Aplicar `20261123120000_webhooks.sql` (arquivo pronto: `APLICAR-SQL-ONDA-122.sql`).
2. Definir `WEBHOOKS_CRON_SECRET` no ambiente do servidor e agendar
   `POST /api/public/cron/webhooks-dispatch` a cada minuto (pg_cron + `net.http_post`
   com o header `x-webhooks-signature = hmac_sha256(secret, corpo)`), **ou** usar
   "Enviar pendentes agora" e o "Testar" — que já despacham na hora.
3. Validação: Segurança → Webhooks → URL de um receptor (ex.: webhook.site) →
   Testar → 200; mudar o status de uma OP → novo POST chega.
4. Onda 123: criação de pedidos pela API (mapeamento `reference_code` →
   `catalog_product_id`) e conector pronto TOTVS/Bling.
