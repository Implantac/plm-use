# H3-04 · ERP Adapter (contrato read-only)

O ERP é sistema externo. O PLM **referencia**, nunca duplica.

## Contrato

Interface única em `src/lib/erp/contract.ts`. Toda leitura ERP passa por
`ErpAdapter`. Implementações trocáveis: `mock-adapter.ts` (dev), adapter
real por integração (Bling, TOTVS, SAP, etc.).

## Regras

- **Nunca** duplicar dado ERP no schema PLM. Guardar apenas `erp_id text`
  - `erp_source text`.
- **Nunca** ler ERP direto do cliente. Sempre via server fn que chama o
  adapter — permite cache, rate limit e auditoria.
- Toda leitura importante emite `entity_events` do tipo `erp_synced` com
  snapshot mínimo do que foi consultado.

## O que fica no ERP (nunca no PLM)

Preço · custo · estoque · fiscal · financeiro · SKU cadastral final ·
apontamento de produção real · notas fiscais.

## O que fica no PLM (nunca no ERP)

Referência em desenvolvimento · piloto · ficha técnica · CAPA · workflow
de aprovação · timeline · relações · comentários.

## Fluxo típico

1. Referência aprovada no PLM → server fn `promoteToErp(reference_id)`
2. Adapter cria SKU no ERP → devolve `erp_id`
3. PLM grava `references.erp_id` e emite evento `erp_synced`
4. A partir daí, todo dado transacional (estoque, custo) é lido do ERP
   via adapter, nunca cacheado além de TTL curto.
