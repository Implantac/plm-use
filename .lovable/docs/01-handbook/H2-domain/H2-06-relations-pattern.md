# H2-06 · Padrão de relações (`entity_relations`)

Toda ligação entre duas entidades passa por `entity_relations` — é a coluna
vertebral do Digital Thread (FPEF V3).

## Schema resumido

`entity_relations(from_type text, from_id uuid, to_type text, to_id uuid,
relation_type text, payload jsonb, created_at, created_by)`

## Convenção `relation_type`

- `derived_from` — piloto derivado de referência
- `part_of` — referência parte de coleção
- `produced_as` — referência produzida como lote
- `evaluated_by` — lote avaliado por CAPA
- `sourced_from` — item de BOM vindo de fornecedor (ERP via erp_id)
- `version_of` — versão nova de ficha técnica

Regra: **verbo no particípio** + preposição, sempre em `snake_case`.

## Como usar

```sql
INSERT INTO public.entity_relations
  (from_type, from_id, to_type, to_id, relation_type, created_by)
VALUES
  ('reference', :ref_id, 'piloto',    :piloto_id, 'produced_as',  :uid),
  ('reference', :ref_id, 'collection', :col_id,   'part_of',      :uid);
```

## UI

Componente `EntityRelations` (`src/components/entity/EntityRelations.tsx`)
renderiza o grafo dentro do `EntityDrawer` (FPEF V4).

## Regras

- **Sempre** ligar via `entity_relations` — nunca via FK direta quando a
  ligação é semântica de negócio (não estrutural).
- FK direta continua sendo usada para composição forte (`comment.entity_id`).
- Nada de "tabela intermediária" custom por tipo de relação.

## Anti-padrões

- Criar `reference_collections`, `piloto_references` etc.
- Guardar array de IDs em jsonb em vez de linhas em `entity_relations`.
- Duplicar relação (mesma chave from/to/type) — usar constraint UNIQUE.
