# V7 · Event Engine

Toda ação gera evento. Timeline, dashboard, BI e IA se alimentam daqui.

## Implementação (pronta)

- Tabela: `public.entity_events` (`entity_type`, `entity_id`, `event_type`, `from_status`, `to_status`, `payload`, `actor`, `actor_name`, `note`, `created_at`)
- Hook consumidor: `src/hooks/use-entity-events.ts` → `useEntityTimeline`, `useEventEmitter`
- Renderer: `src/components/entity/EntityTimeline.tsx`
- Trigger automático: `log_reference_status_change()` em `references`

## `entity_type` conhecidos

`reference` · `lote` · `tech_sheet` · `piloto` · `capa` · `engenharia` · `facao_order`

## `event_type` canônicos (catálogo mínimo)

- `created` · `updated` · `deleted`
- `status_changed` (obrigatório `from_status` + `to_status`)
- `commented` · `attached` · `mentioned`
- `approved` · `rejected` · `assigned`
- `linked` (nova aresta em `entity_relations`)
- `erp_synced` (payload = snapshot leve do ERP)
- `sla_breached` · `alert_raised`

## Gaps

- `LoteTimeline` e `capa_events` ainda são tabelas separadas → migrar leitura para `useEntityTimeline` mantendo compat
- Nenhum trigger em `pcp_lots`, `quality_capa`, `tech_sheets` — só `references` está automatizado
- Falta enum/constraint no `event_type` — hoje é string livre

## Regra de ouro

**Nenhuma mutação de entidade sem `emit()` correspondente.** Se for repetitiva, vira trigger.
