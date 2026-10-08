# V3 · Digital Thread

Coração do sistema. Toda entidade conhece origem e destino.

## Cadeia canônica

```
Coleção → Tema → Linha → Família → Grupo → Referência → Cor → Grade
        → Tabela de Medidas → Ficha Técnica → Piloto → Engenharia → BOM
        → Custos → Compras → Lote → OP → Facção → Produção → Qualidade
        → Expedição → Vendas → Margem → BI
```

## O que já existe

| Nó               | Onde                       | Estado      |
| ---------------- | -------------------------- | ----------- |
| Referência       | `public.references`        | ✅          |
| Ficha Técnica    | `public.tech_sheets`       | ✅ básico   |
| Piloto           | não existe tabela dedicada | 🔴          |
| Lote             | `public.pcp_lots`          | ✅          |
| Ocorrência       | `public.pcp_occurrences`   | ✅          |
| CAPA             | `public.quality_capa`      | ✅          |
| Grafo entre eles | `public.entity_relations`  | ✅ genérico |
| Eventos          | `public.entity_events`     | ✅          |

## Gaps

- **Coleção → Tema → Linha → Família → Grupo**: não modelados como entidades. Hoje viram string em `references.collection_id` / `line` / `theme`.
- **Cor, Grade, Tabela de Medidas**: viram jsonb dentro da ficha técnica; sem consulta cruzada.
- **Piloto**: não é entidade de 1ª classe, é status de referência. Decidir se vira tabela.
- **Vendas / Margem**: vêm do ERP (V9), não deve ser tabela local.

## Regra de ouro

Nunca criar uma tabela nova sem antes registrar a aresta em `entity_relations`.
Nunca query SQL cruzada sem passar por `useEntityRelations`.
