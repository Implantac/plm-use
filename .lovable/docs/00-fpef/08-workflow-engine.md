# V8 · Workflow Engine

Fluxos, responsáveis, SLA, checklist, aprovações e dependências — **configuráveis em tabela**, não hardcoded.

## O que já existe
- `public.reference_transitions` — máquina de estados original de References (mantida por compatibilidade).
- `can_transition_reference(from, to)` — validador SECURITY DEFINER (legado, ainda ativo).
- Trigger de log ao mudar status em `references`.
- 🟢 **`public.workflow_definitions`** — motor polimórfico com colunas `entity_type`, `from_status`, `to_status`, `requires_role`, `requires_checklist`, `sla_hours`, `is_active`.
- 🟢 **`can_transition(entity_type, from, to)`** — validador genérico SECURITY DEFINER.
- 🟢 Seed inicial: transições de `reference` (espelhadas), `lote`, `capa`, `tech_sheet`.
- 🟢 Hook `src/hooks/use-workflow.ts` — `useWorkflow(entityType)` devolve `nextStatuses`, `canTransition`, `validateRemote`.

## Gaps restantes
- `requires_role` e `requires_checklist` existem no schema mas não são consultados pelo validador ainda.
- Nenhum trigger de log automático para entidades além de `references` (Lote/CAPA continuam logando via client em `entity_events`).
- Sem SLA runtime (motor de alertas quando `sla_hours` estoura).
- UI de administração das definições de workflow ainda não existe (edição só via SQL/service_role).

## Design implementado
```
workflow_definitions (
  entity_type TEXT,
  from_status TEXT,
  to_status TEXT,
  requires_role TEXT,
  requires_checklist JSONB,
  sla_hours INT,
  is_active BOOLEAN
)  UNIQUE (entity_type, from_status, to_status)

can_transition(entity_type, from, to) -> BOOLEAN
```

## Regra de ouro
Trocar status **sempre** via `useWorkflow(...).validateRemote(from, to)` ou
`can_transition(...)` no banco. Nunca `UPDATE ... SET status = ...` direto do client
sem passar pela validação.
