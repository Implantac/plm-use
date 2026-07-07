# H2-05 · Padrão de workflow (`workflow_definitions`)

Estados válidos e transições permitidas ficam **em tabela**, nunca em código.

## Schema

`workflow_definitions(id, entity_type, from_status, to_status, requires_role,
requires_field, is_active, created_at, updated_at, ...)`

Função canônica: `public.can_transition(_entity_type, _from, _to)`.

## Como adicionar workflow

1. **Definir estados** na spec (H1-05). Poucos, com significado claro.
2. **Inserir linhas** em `workflow_definitions` via migration:

```sql
INSERT INTO public.workflow_definitions
  (entity_type, from_status, to_status, requires_role, is_active)
VALUES
  ('<entity>', 'draft',       'in_review', NULL,             true),
  ('<entity>', 'in_review',   'approved',  'coordinator',    true),
  ('<entity>', 'in_review',   'rejected',  'coordinator',    true),
  ('<entity>', 'approved',    'published', 'manager',        true),
  ('<entity>', 'published',   'archived',  'manager',        true);
```

3. **Server function** para aplicar transição, validando `can_transition` e
   role. Padrão em `src/lib/workflow/transition.functions.ts`.

4. **Trigger** emite `status_changed` em `entity_events` (H2-04).

5. **UI**: componente `WorkflowStatusMenu` (`src/components/workflow/`) lê
   próximas transições disponíveis via `useWorkflow` hook.

## Regras

- **Nunca** hardcode estados em `enum` do TS ou `switch` em componente.
- Um estado terminal (`archived`, `deleted`, `rejected`) não deve ter linhas
  de saída, exceto reabertura explícita.
- Toda transição sensível exige role via `requires_role`.
- Reversão precisa ser transição explícita cadastrada (`archived → draft`),
  nunca UPDATE direto.

## Anti-padrões

- `enum ReferenceStatus { ... }` no TS como fonte de verdade.
- `if (status === 'approved') { ... }` no componente.
- Backend permitindo UPDATE de `status` sem passar pela server function.
