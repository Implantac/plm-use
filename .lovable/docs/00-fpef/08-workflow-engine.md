# V8 · Workflow Engine

Fluxos, responsáveis, SLA, checklist, aprovações e dependências — **configuráveis em tabela**, não hardcoded.

## O que já existe
- `public.reference_transitions` — máquina de estados de References
- `can_transition_reference(from, to)` — validador SECURITY DEFINER
- Trigger de log ao mudar status

## Gaps críticos
- Só References tem workflow em tabela. Lote, CAPA, Piloto, Ficha usam status hardcoded no client.
- Não existem colunas `requires_role`, `requires_checklist`, `sla_hours` em `reference_transitions` (planejadas no `.lovable/plan.md` mas não aplicadas)
- Não há motor genérico `entity_transitions` polimórfico

## Design proposto (futuro, quando aprovado)
```
entity_workflows (entity_type, from_status, to_status, requires_role, requires_checklist jsonb, sla_hours)
entity_workflow_gates (workflow_id, gate_type, config jsonb)
```
`can_transition(entity_type, from, to, actor)` retorna `{ok, reason}`.

## Regra de ouro
Trocar status **sempre** via função que consulta a tabela de workflow.
Nunca `UPDATE ... SET status = ...` direto do client sem passar pela validação.
