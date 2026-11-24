# Onda 121 — API pública v1 + chaves de API

**Dor:** o PLM não conversava com nada fora dele. ERP (TOTVS, Bling), loja
(VTEX) e BI precisavam de exportação manual (CSV) para enxergar referências,
materiais, pedidos, OPs e estoque. Os PLMs de referência (Kubix "API-first",
WFX com conectores NetSuite/SAP) tratam integração como requisito mínimo.

**Entrega:** API REST de leitura, documentada em OpenAPI, autenticada por
chave gerenciada em **Segurança → Chaves de API**. Webhooks e conectores
prontos (TOTVS/Bling) são a continuação natural (Onda 122+).

## O que ficou pronto

| Peça                                                                                            | Onde                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Tabela `api_keys` (hash sha-256, prefixo, escopos, último uso, revogação; RLS só admin/manager) | `supabase/migrations/20261122120000_api_keys.sql` |
| Mapa de recursos (7) com colunas explícitas, filtros, cursor e OpenAPI 3.0.3                    | `src/lib/api/recursos-v1.ts`                      |
| Autenticação por Bearer (`plm_live_…`), 401/503 claros, `last_used_at`                          | `src/lib/api/api-key-auth.server.ts`              |
| `GET /api/v1/<recurso>` (rate limit 120/min por chave, keyset pagination)                       | `src/routes/api/v1/$recurso.ts`                   |
| `GET /api/v1/openapi.json` (público, CORS `*`)                                                  | `src/routes/api/v1/openapi[.]json.ts`             |
| Server functions listar/criar/revogar (chave devolvida **uma vez**)                             | `src/lib/api/api-keys.functions.ts`               |
| Card "Chaves de API" em `/security` (sem rota nova: trava das 44 rotas)                         | `src/components/security/ChavesApiCard.tsx`       |
| Trava (9 testes)                                                                                | `src/lib/api/recursos-v1.test.ts`                 |

### Recursos

`references`, `materials`, `suppliers`, `sales-orders`, `production-orders`,
`stock-balance` (view, snapshot sem cursor), `tech-sheets`.

### Contrato

```
GET /api/v1/references?limit=100&updated_since=2026-11-01T00:00:00Z&cursor=…
Authorization: Bearer plm_live_…
→ 200 { "data": [...], "next_cursor": "…" | null, "count": n }
→ 400 { "error": "limit deve ser inteiro ≥ 1" }      (parâmetro ruim)
→ 401 { "error": "Chave desconhecida." }             (sem/má chave, revogada)
→ 404 { "error": "Recurso desconhecido: x", "recursos": [...] }
→ 429 Retry-After                                    (120 req/min por chave)
→ 503 { "error": "… migration pendente" }            (tabela api_keys ausente)
```

- `limit` ≤ 500 (acima é limitado, não rejeitado); padrão 100.
- Cursor = base64url(`updated_at|id`); ordenação estável `(updated_at, id)`.
- Nunca `select *`: a trava compara cada coluna do mapa com `types.ts`.
- Leitura com service role **só depois** de validar a chave; `cache-control: no-store`.

## Prova local (vite 5179, sem service role)

| Chamada                                         | Resultado                                            |
| ----------------------------------------------- | ---------------------------------------------------- |
| `GET /api/v1/openapi.json`                      | 200, OpenAPI 3.0.3 com os 7 paths                    |
| `GET /api/v1/references` sem header             | 401 "Envie Authorization: Bearer <chave de API>."    |
| `Bearer errada`                                 | 401 "Chave inválida (formato esperado: plm_live_…)." |
| `Bearer plm_live_abc…` (bem formada, sem banco) | 503 "servidor sem credencial de banco."              |
| `?limit=0`                                      | 400                                                  |
| `stock-balance?updated_since=…`                 | 400 "é um snapshot"                                  |
| `GET /api/v1/nope`                              | 404 com lista de recursos                            |

Card em Segurança (lista simulada via interceptação do server fn):
`auditoria/api121-local-card-chaves.png`.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **vitest 1003/1003 (178 arquivos)**.

## Pendente para funcionar em produção

1. Aplicar **duas** migrations: `20261121120000_rfq_quotes_persistidas.sql`
   (Onda 119) e `20261122120000_api_keys.sql` (esta).
2. Publicar; em Segurança criar a chave "Teste" e rodar
   `curl -H "Authorization: Bearer plm_live_…" https://plmuse.lovable.app/api/v1/references?limit=5`.
3. Onda 122: webhooks (`order.created`, `production_order.status_changed`,
   `tech_sheet.approved`) + escrita de pedidos/estoque vindos do ERP.
