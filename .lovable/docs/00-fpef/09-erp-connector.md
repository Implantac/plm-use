# V9 · ERP Connector

PLM **lê** do ERP. Nunca escreve. Nunca duplica.

## Implementação (pronta)
- Contrato: `src/lib/erp/contract.ts` — `ErpProduct`, `ErpSupplier`, `ErpStockLevel`, `ErpPurchaseOrder`, `ErpProductionOrder`
- Adapter mock: `src/lib/erp/mock-adapter.ts`
- Factory: `src/lib/erp/index.ts` (troca por `VITE_ERP_MODE=http` no futuro)
- Hooks: `src/hooks/use-erp.ts`
- UI: `src/components/erp/ErpBadge.tsx` — mostra "Fonte: ERP · sincronizado há Xmin"

## Contrato (read-only, sem create/update/delete)
`getProduct` · `searchProducts` · `getSupplier` · `searchSuppliers` · `getStock` · `listPurchaseOrders` · `listProductionOrders`

## Gaps
- HTTP adapter real não implementado (stub apenas)
- `ErpBadge` usado em pouquíssimos lugares
- `entity_relations.to_external_id` está no schema mas quase não é populado
- Sem cache warming / sync periódico (por decisão — é pull sob demanda)

## Regra de ouro
Se algum dia pedirem "campos do fornecedor no PLM", a resposta é **não**.
A resposta certa é: expor via `ErpBadge` e/ou expandir o contrato.
