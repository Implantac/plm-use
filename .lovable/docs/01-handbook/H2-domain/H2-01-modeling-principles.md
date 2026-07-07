# H2-01 · Princípios de modelagem

Antes de escrever `CREATE TABLE`, valide todos os itens abaixo.

## 1. Antes de criar tabela, tente reusar
- Existe entidade parecida em V5 (Domain Model)?
- É variante que cabe como `type` + payload jsonb?
- É estado que cabe em `workflow_definitions`?
- É evento que cabe em `entity_events`?

## 2. Colunas obrigatórias em toda tabela do PLM
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `created_by uuid references auth.users` (quando aplicável)
- `updated_by uuid references auth.users` (quando aplicável)

## 3. Nunca duplicar ERP
- Se a informação vem do ERP: coluna `erp_id text` + `erp_source text`.
  Nada de duplicar preço, estoque, custo, SKU cadastral.

## 4. Segurança por padrão
Ordem obrigatória em cada migration de tabela pública:
1. `CREATE TABLE public.x (...)`
2. `GRANT` para roles permitidos (nunca esquecer `service_role`)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY ...` — nunca genérica; sempre por ação (SELECT/INSERT/UPDATE/DELETE)

## 5. Regra no banco quando possível
- Constraints (NOT NULL, CHECK, UNIQUE, FK) antes de validação no cliente.
- Trigger `SECURITY DEFINER` para regras que **não podem** ser burladas.
- Função `has_role(_uid, _role)` para autorização — nunca comparar role em coluna.

## 6. Evento em toda mudança relevante
Trigger `AFTER INSERT/UPDATE` em `entity_events`, seguindo o padrão dos
existentes `log_reference_status_change` e `log_piloto_status_change`.

## 7. Índice em toda FK e coluna de filtro
- FK sem índice = varredura sequencial.
- Coluna usada em `WHERE` frequente = índice dedicado.
- Coluna JSONB filtrada = índice `GIN`.

## 8. Nunca soft delete implícito
- Se apaga: `DELETE` real, com trigger que grava evento `deleted`.
- Se arquiva: coluna `archived_at timestamptz` + policy que filtra.

## 9. Nomes em `snake_case`, singular quando entidade, plural quando coleção
- Tabela: plural (`pilotos`, `references`, `tech_sheets`).
- Coluna FK: singular + `_id` (`reference_id`, `piloto_id`).
- Enum: singular (`reference_status`, `piloto_tipo`).

## 10. Comentários no schema
`COMMENT ON TABLE / COLUMN` explicando **regra de negócio**, não repetindo o
nome. A IA usa isso para gerar contexto sem alucinar.
