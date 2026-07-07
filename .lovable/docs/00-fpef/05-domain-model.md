# V5 · Domain Model

Pense em **entidades**, não em tabelas.

## Entidades do PLM (owned)

| Entidade | Tipo em `entity_type` | Tabela | Responsável |
|----------|----------------------|--------|-------------|
| Referência | `reference` | `references` | Desenvolvimento |
| Ficha Técnica | `tech_sheet` | `tech_sheets` | Engenharia |
| Lote | `lote` | `pcp_lots` | PCP |
| Piloto | `piloto` | (não existe) | Pilotagem |
| CAPA | `capa` | `quality_capa` | Qualidade |
| Engenharia | `engenharia` | (não existe) | Engenharia |
| Ordem de Facção | `facao_order` | (não existe) | PCP |
| Influencer | — | `influencers` | Marketing |
| Comentário | — | `comments` | Todos |

## Entidades do ERP (referenced, nunca duplicadas)

Produto · Estoque · Fornecedor · Pedido de Compra · Ordem de Produção · Cliente · NF · Financeiro

Interface: `src/lib/erp/contract.ts`

## Atributos que TODA entidade PLM deve ter
- `id`, `created_at`, `updated_at`, `created_by`, `updated_by`
- `status` (enum com workflow em `reference_transitions` ou equivalente)
- Timeline via `entity_events`
- Relacionamentos via `entity_relations`
- Comentários via `comments` (polimórfico por `entity_type`/`entity_id`)
- Anexos via `comment_attachments` (ou tabela de attachments dedicada — decidir)

## Gaps
- Piloto, Engenharia, Ordem de Facção não são tabelas de 1ª classe
- Falta diagrama ER visual (Mermaid) — futuro
- Falta catálogo de `event_type` permitidos por `entity_type` (V7)
