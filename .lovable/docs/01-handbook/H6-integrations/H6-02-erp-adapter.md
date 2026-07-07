# H6-02 · ERP (via `ErpAdapter`)

Referência primária: H3-04.

## Contrato
`src/lib/erp/contract.ts` — interface `ErpAdapter`:
- `getSku(erp_id)` · `getSupplier(erp_id)` · `getPurchaseOrder(erp_id)`
- `getWorkOrder(erp_id)` · `getInvoice(erp_id)` · `getStock(erp_id)`
- `createSku(input)` · `updateSku(erp_id, patch)`
- `pushBom(reference_id, bom)` · `pushBop(reference_id, bop)`

Todo método retorna `Result<T, ErpError>` — nunca lança sem tipo.

## Implementações
- `mock-adapter.ts` — dev, testes E2E, previews sem ERP real.
- Adapter por ERP: um arquivo por fornecedor (`bling-adapter.ts`,
  `totvs-adapter.ts`, `sap-adapter.ts`). Selecionado por env
  `ERP_ADAPTER=bling|totvs|sap|mock`.

## Sincronização de estado
- PLM guarda `erp_id` + `erp_source` + `erp_synced_at`.
- Nada de duplicar preço/estoque/custo — sempre re-consultar via adapter
  com cache curto (60s).
- Evento `erp_synced` com snapshot mínimo (`{ erp_id, fields_read: [...] }`).

## Falha
- Timeout > 3s → adapter retorna `Result.err('timeout')`.
- Server fn expõe ao cliente via toast "ERP indisponível — tentar de novo".
- Nunca fingir sucesso, nunca dado stub silencioso.

## Anti-padrões
- Espelhar tabela ERP inteira em `public.erp_skus`.
- Adapter que faz "auto-refresh a cada N segundos" em background.
- Cache de dado financeiro > 60s.
