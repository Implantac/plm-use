# H9-10 · Lançamento — Plano de Implementação

Elo seguinte ao Mostruário (H9-09). Consolida a **decisão comercial** em um **plano de lançamento** rastreável: quais referências entram na coleção comercial, em qual janela, com qual grade, preço-alvo (referência via ERP) e meta de produção. Fecha o ciclo `Qualidade → Mostruário → Lançamento → Produção/Comercial`.

## 1. Escopo do playbook

**Faz parte (PLM):**
- Consolidar `showroom_decision = aprovada` em uma **Launch Wave** (janela comercial: coleção, mês, canal).
- Definir grade final, cor final, meta de venda esperada, prioridade de produção, canal (varejo/atacado/e-com).
- Gerar handoff idempotente para PCP (produção) e Comercial (catálogo/pedido), sem duplicar entidades do ERP.
- Timeline unificada, workflow versionado, feedback pós-lançamento (sell-through vindo do ERP via adapter).

**Fora (ERP, via `ErpAdapter`):**
- Criação real de SKU comercial, preço final, ordem de produção contábil, pedido de venda, NF, saldo.
- Cálculo de custo, margem, MRP.

## 2. Modelo de dados (novo)

```text
launch_wave (janela comercial)
  ├── launch_item (uma linha por referência lançada nessa wave)
  │      ├── launch_item_grade (tamanhos/cores previstos)
  │      └── launch_channel_target (varejo | atacado | ecom + meta)
  └── launch_handoff (registro idempotente de envio ao ERP: pcp / comercial)
```

Campos-chave (sem preço/custo/estoque — proibidos por H9-00):
- `launch_wave`: `codigo`, `colecao`, `janela_inicio`, `janela_fim`, `status`, `responsavel_id`.
- `launch_item`: `wave_id`, `reference_id`, `showroom_decision_id` (origem), `prioridade`, `meta_unidades`, `status`, `erp_sku_ref` (só id externo).
- `launch_handoff`: `wave_id`, `destino` (`pcp` | `comercial`), `idempotency_key`, `erp_source`, `erp_id`, `synced_at`, `payload_hash`.

## 3. Workflow (registrado em `workflow_definitions`)

- `launch_wave`: `rascunho → em_revisao → aprovada → publicada → em_producao → lancada → encerrada` (+ `cancelada` como saída controlada).
- `launch_item`: `proposto → validado → aprovado → em_producao → disponivel → esgotado | descontinuado`.
- Toda transição sensível exige `requires_role` (`coordenador_produto`, `diretor_produto`, `comercial`, `pcp`).

## 4. Eventos (`entity_events`)

`launch.wave.created` · `launch.wave.status_changed` · `launch.item.added` · `launch.item.status_changed` · `launch.handoff.sent` · `launch.handoff.confirmed` · `launch.performance.updated` (sell-through do ERP).

Triggers automatizam `status_changed` e `handoff.*`. Cliente **nunca** insere em `entity_events`.

## 5. UX

- Rota `/launch` (autenticada) com abas: **Waves**, **Itens**, **Handoffs**, **Performance**.
- `EntityDrawer` reaproveitado para `launch_wave` e `launch_item` (timeline + relations + comentários).
- Ação principal: "Promover decisões de mostruário → nova wave" (bulk, filtrado por período).
- Estados vazio/carregando/erro cobertos; realtime via tópico escopado `launch-live`.

## 6. IA (V11)

- Agente **Merchandiser**: sugere composição da wave a partir de feedback do mostruário (dimensão × nota), sinaliza sobreposição de mix e gaps de grade.
- Agente **PCP-planner**: propõe prioridade de produção a partir de meta_unidades × lead time histórico (eventos).
- Guardrail: agentes **sugerem**, humano decide; toda sugestão gravada como evento `ai_suggested` com hash do contexto.

## 7. Integração ERP (H6-02)

- Leitura sob demanda: `erpAdapter.getSku(erp_sku_ref)` para exibir preço/EAN (cache ≤ 60s).
- Escrita: `erpAdapter.writeErp('launch_handoff', payload, idempotency_key)` — chave determinística `wave:{id}:destino:{pcp|comercial}:v{n}`.
- Performance: `erpAdapter.getSellThrough({ref_ids, from, to})` alimenta `launch.performance.updated` via cron `/api/public/cron/launch-performance` (assinado).

## 8. Checklist técnico pré-produção

### 8.1 Migrações (ordem)
- [ ] `launch_wave`, `launch_item`, `launch_item_grade`, `launch_channel_target`, `launch_handoff` — cada `CREATE TABLE` seguido de `GRANT` (`authenticated` + `service_role`, **sem `anon`**), `ENABLE RLS`, policies por ação, trigger `updated_at`, índices em FKs e (`wave_id`, `reference_id`, `status`).
- [ ] Inserts em `workflow_definitions` para `launch_wave` e `launch_item` com `requires_role`.
- [ ] Triggers `log_launch_*_status_change` gravando `entity_events`.
- [ ] Trigger de validação: `launch_item` só aceita `reference_id` com `showroom_decision.decision = 'aprovada'`.
- [ ] `COMMENT ON TABLE/COLUMN` para contexto de IA.
- [ ] Rollback documentado (drop na ordem inversa).

### 8.2 RLS (H2-03 / H3-03)
- [ ] SELECT: `is_member(auth.uid())` **+** papel específico (`coordenador_produto`, `comercial`, `diretor_produto`, `pcp`, `admin`) via nova função `has_any_launch_role(uid)`.
- [ ] INSERT: `WITH CHECK (auth.uid() = created_by AND has_any_launch_role(auth.uid()))`.
- [ ] UPDATE: owner OR (`coordenador_produto` | `diretor_produto` | `admin`); `WITH CHECK` em `updated_by`.
- [ ] DELETE: apenas `admin` — demais estados via transição `cancelada`.
- [ ] Nenhuma policy `FOR ALL USING (true)`; nenhuma `TO anon`.
- [ ] `handoff` protegido contra UPDATE de `idempotency_key`, `erp_id`, `synced_at` (trigger `BEFORE UPDATE` rejeita).

### 8.3 Realtime (tópico `launch-live`)
- [ ] Policy em `realtime.messages` para `launch-live` exige `can_access_module_topic('launch-live')` estendida com papéis do lançamento — **sem `is_member` sozinho**.
- [ ] Tópicos por entidade (`launch:{wave_id}`) validam via `can_access_entity_topic(wave_id)`.
- [ ] Payload de broadcast **não** carrega meta_unidades/valores sensíveis — apenas ids e status.
- [ ] Cleanup: teardown do channel em `useEffect` (evitar loop de reconexão).

### 8.4 Server functions (H3-02)
- [ ] `createLaunchWave`, `addLaunchItem`, `promoteShowroomDecisions`, `transitionLaunch*` com `requireSupabaseAuth` + `has_role`.
- [ ] `sendLaunchHandoff` (POST) — idempotente, valida wave `aprovada`, chama `erpAdapter.writeErp`, grava `launch.handoff.sent`.
- [ ] Zod em toda entrada; nenhum `any`.
- [ ] Nenhum helper de topo referenciado dentro de `.handler()` (evitar split transform).

### 8.5 Permissões / papéis
- [ ] Novos papéis já existem no enum `app_role` (`comercial`, `diretor_produto`, `coordenador_produto`, `pcp`); caso falte algum, migration adiciona.
- [ ] `has_any_launch_role()` `SECURITY DEFINER`, `search_path = public`, `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` (só o motor SQL invoca).
- [ ] Auditoria: toda ação sensível gera `entity_events` com `actor = auth.uid()`.

### 8.6 Cron / webhook público
- [ ] `/api/public/cron/launch-performance` verifica HMAC via `LAUNCH_CRON_SECRET` antes de qualquer escrita.
- [ ] Idempotência: `payload_hash` bloqueia reprocesso.
- [ ] Timeouts e retries documentados.

### 8.7 UX / A11y (H4-05)
- [ ] Estados vazio/carregando/erro em todas as abas.
- [ ] Contraste AA; navegação por teclado; foco visível.
- [ ] Textos em pt-BR consistentes.
- [ ] `EntityDrawer` mostra timeline + relations + comments.

### 8.8 Testes (H7)
- [ ] RLS: matriz 8 cenários por tabela (anon, member sem papel, papel correto, owner, não-owner, admin, insert força `created_by`, delete só admin).
- [ ] Workflow: toda transição válida passa; toda inválida falha; role errado falha.
- [ ] Idempotência do handoff (mesmo `idempotency_key` → 1 registro).
- [ ] E2E Playwright: promover 3 decisões → wave → aprovar → handoff → ver evento na timeline.

### 8.9 Segurança (H8-04) — findings abertos hoje
- [ ] Corrigir `REALTIME_BROADCAST_MISSING_SCOPE` residual: garantir que o novo `launch-live` já nasça com escopo por papel.
- [ ] Corrigir `REALTIME_BROADCAST_WILDCARD_TOPIC` para os wildcards que este elo introduz (`launch:%`).
- [ ] Revisar `SUPA_authenticated_security_definer_function_executable`: revogar `EXECUTE` de `has_any_launch_role` e triggers novas.
- [ ] `security--run_security_scan` sem novo `error` após deploy.
- [ ] Atualizar `security-memory` com decisões deste elo.

### 8.10 Observabilidade & BI (H3-05 / V10)
- [ ] KPIs derivados de `entity_events`: `time_to_launch`, `handoff_success_rate`, `sell_through_D30`, `waves_publicadas_mes`.
- [ ] Dashboard consome view materializada refreshada por cron.
- [ ] Logs de server fns com `request_id` propagado.

### 8.11 Release (H7-05)
- [ ] Build + tsgo + lint verdes.
- [ ] Migração revisada (GRANT/RLS/policies por ação).
- [ ] `supabase--linter` sem novo warning não justificado.
- [ ] Design Review (V13) aprovado.
- [ ] Rollback plan escrito.

## 9. Ordem de execução sugerida

```text
1. Playbook H9-10 .md + README H9 atualizado
2. Migration 1 — tabelas + GRANT + RLS + índices
3. Migration 2 — workflow_definitions + triggers de eventos + validação showroom_decision
4. Migration 3 — realtime policies escopadas + revoke EXECUTE
5. server fns (createServerFn) + hooks + rota /launch
6. Cron público de performance + integração ErpAdapter
7. Testes (RLS + workflow + E2E) + security scan
8. Release checklist (H7-05)
```

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Duplicar SKU/preço no PLM | Adapter obrigatório; campos proibidos bloqueados em code review |
| Handoff duplicado ao ERP | `idempotency_key` determinístico + `payload_hash` |
| Vazamento de meta comercial via realtime | Tópicos escopados por papel; payload mínimo |
| Wave publicada com item sem decisão aprovada | Trigger de validação no `launch_item` |
| Cron sem autenticação | HMAC obrigatório antes de qualquer escrita |

Aprovando este plano, sigo com o `.md` do playbook + primeira migração (tabelas + RLS + GRANT).
