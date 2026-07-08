# H9-10 · Lançamento

> Elo seguinte ao Mostruário (H9-09). Consolida decisões comerciais em
> **Launch Waves** rastreáveis e faz o handoff idempotente ao ERP.

---

## Fronteira PLM × ERP (bloco fixo — não editar por playbook)

O PLM **modela, decide e rastreia**. O ERP **executa e contabiliza**.

- **Dentro do PLM:** wave comercial, item de lançamento, grade prevista,
  meta por canal, workflow, eventos, handoff (registro idempotente).
- **Fora (ERP):** SKU comercial real, preço, custo, pedido de venda, NF,
  ordem de produção contábil, saldo, financeiro.
- **Nunca duplicar tabela do ERP.** Guardamos `erp_sku_ref`, `erp_id`,
  `erp_source`, `synced_at` — cache ≤ 60s.
- **Campos proibidos** em `public.launch_*`: `price`, `cost`, `stock_qty`,
  `balance`, `ap_amount`, `ar_amount`, `nf_number`.
- **Escritas no ERP só via `ErpAdapter.writeErp()` com `idempotency_key`
  determinístico**.

---

## 0. Identificação

- **Elo da cadeia (V2):** Lançamento comercial (pós-mostruário, pré-produção massiva)
- **Código do playbook:** H9-10
- **Volumes FPEF relacionados:** V2, V5, V6, V7, V8, V9, V10, V11
- **Personas envolvidas (V1):** coordenador_produto, merchandising, comercial, diretor_produto, pcp
- **Estado:** 🟡 parcial
- **Autor / Revisor:** Software House Enterprise · Squad PLM
- **Última revisão:** 2026-07-08

## 1. Objetivo do elo

Transformar decisões aprovadas no mostruário em um **plano de lançamento
executável**: quais referências entram na coleção comercial, em qual
janela, com qual grade prevista, qual meta por canal e qual prioridade
para PCP. Fecha o ciclo Qualidade → Mostruário → Lançamento → Produção.

- **Resultado esperado:** wave publicada com handoffs `pcp` e `comercial`
  confirmados no ERP.
- **KPI de sucesso:** `time_to_launch` (aprovação showroom → wave
  publicada) < 10 dias úteis; `handoff_success_rate` > 98%.

## 2. Escopo

- **Faz parte:** montar wave, validar composição, aprovar, publicar,
  enviar handoff idempotente ao ERP, acompanhar sell-through D30.
- **Não faz parte:** criar SKU no ERP, precificar, produzir, faturar,
  operar canal (site, loja, atacado).
- **Elo anterior:** H9-09 · Mostruário
- **Elo posterior:** H9-11 · Engenharia de Produto (BOM/BOP final)
  + retro para H9-01 · Coleção via `launch.performance.updated`.

## 3. Entradas (inputs)

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Decisão aprovada de mostruário | `showroom_decision` (H9-09) | linha `decision = 'aprovada'` | sim |
| 2 | Referência | `references` | id + status ≥ APROVADA | sim |
| 3 | Preço/EAN sugerido | ERP via `ErpAdapter.getSku()` | cache ≤ 60s | não (só leitura) |
| 4 | Capacidade/lead time histórico | `entity_events` (PCP) | agregação | não |

## 4. Saídas (outputs)

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | Wave publicada | Comercial + PCP | `launch_wave` / `launch.wave.status_changed` | sim |
| 2 | Handoff PCP | ERP (produção) | `launch_handoff` / `launch.handoff.sent` | sim |
| 3 | Handoff Comercial | ERP (catálogo) | `launch_handoff` / `launch.handoff.sent` | sim |
| 4 | Snapshot sell-through | Dashboard/BI | `launch.performance.updated` | não |

## 5. Regras de negócio (V6)

- **R1:** `launch_item` só aceita `reference_id` com `showroom_decision.decision = 'aprovada'` (trigger).
- **R2:** Wave só transita para `publicada` com ≥ 1 item `aprovado` e handoffs pendentes gerados.
- **R3:** `launch_handoff` é imutável após `synced_at IS NOT NULL` (trigger `BEFORE UPDATE` rejeita).
- **R4:** Nenhum campo de preço/custo/estoque em `public.launch_*`.
- **R5:** Cancelar wave só via transição `cancelada` — nunca DELETE (exceto admin).

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB trigger | `enforce_launch_item_from_approved_decision` |
| R2 | server fn `transitionLaunchWave` | `src/lib/launch/transition.functions.ts` |
| R3 | DB trigger | `enforce_launch_handoff_immutability` |
| R4 | code review | H9-00 fronteira |
| R5 | RLS + workflow | `workflow_definitions` |

## 6. Workflow (V8)

```text
launch_wave: rascunho → em_revisao → aprovada → publicada → em_producao → lancada → encerrada
                                           ↘ cancelada (saída controlada)

launch_item: proposto → validado → aprovado → em_producao → disponivel → esgotado | descontinuado
```

- Máquina registrada em `workflow_definitions`? SIM
- Transições proibidas listadas? SIM (ausência de linha = proibida)
- `requires_role`: `aprovada` = `coordenador_produto`; `publicada` = `diretor_produto`; `em_producao` = `pcp`.

## 7. Eventos emitidos (V7)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `launch.wave.created` | INSERT wave | `codigo`, `colecao` | Timeline, BI |
| `launch.wave.status_changed` | UPDATE status | `from`, `to` | Timeline, workflow |
| `launch.item.added` | INSERT item | `reference_id`, `showroom_decision_id` | Timeline |
| `launch.item.status_changed` | UPDATE status | `from`, `to` | Timeline |
| `launch.handoff.sent` | INSERT handoff | `destino`, `idempotency_key` | ERP, auditoria |
| `launch.handoff.confirmed` | UPDATE `synced_at` | `erp_id`, `erp_source` | BI |
| `launch.performance.updated` | Cron sell-through | `ref_ids`, `janela` | Dashboard |

## 8. Integrações (H6)

- **ERP (H6-02):** `getSku`, `writeErp('launch_handoff', ...)`,
  `getSellThrough`. Idempotência via `wave:{id}:destino:{pcp|comercial}:v{n}`.
- **Webhooks/Cron (H6-05):** `/api/public/cron/launch-performance`
  (HMAC obrigatório via `LAUNCH_CRON_SECRET`). Diário 03:00 UTC.

## 9. UX (V4 / H4)

- **Rotas:** `/launch` (autenticada) com abas `Waves`, `Itens`, `Handoffs`, `Performance`.
- **Componentes contextuais:** `EntityDrawer` + `EntityTimeline` + `EntityRelations` + `CommentsPanel` para `launch_wave` e `launch_item`.
- **Fluxo em cliques:** promover decisões → nova wave → aprovar → publicar → handoff (≤ 5 cliques do estado zero).
- **Estados cobertos:** vazio, carregando, erro, sucesso ✔.

## 10. IA (V11 / H5)

- **Agente Merchandiser:** sugere composição da wave (mix, gaps de grade) a partir de `showroom_feedback` × histórico.
- **Agente PCP-planner:** propõe prioridade a partir de `meta_unidades` × lead time histórico.
- **Contexto vivo:** `showroom_decision`, `showroom_feedback`, `entity_events`, `pcp_lots`.
- **Guardrail:** sugerem, não decidem. Toda sugestão vira `entity_events(event_type = 'ai_suggested')` com hash do contexto.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| `time_to_launch` | avg(publicada − decisão_aprovada) | dias úteis | < 10 | coordenador_produto |
| `handoff_success_rate` | confirmed / sent | % | > 98 | pcp |
| `sell_through_D30` | ERP: venda 30d / meta | % | > 60 | comercial |
| `waves_publicadas_mes` | count(publicada) | # | plano | diretor_produto |

Derivados de `entity_events` (+ `ErpAdapter.getSellThrough`).

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** todas as tabelas com policy por ação (SELECT/INSERT/UPDATE/DELETE); sem `TO anon`.
- **GRANT:** `authenticated` + `service_role` em toda tabela.
- **Papéis autorizados:** via `has_any_launch_role(uid)` (novo) = `coordenador_produto` | `merchandising` | `comercial` | `diretor_produto` | `pcp` | `admin`.
- **Realtime:** tópico `launch-live` escopado por papel; `launch:{wave_id}` por `can_access_entity_topic`. Payload sem meta financeira.
- **Cron público:** HMAC obrigatório antes de qualquer escrita.
- **PII/sensível:** meta comercial só para os papéis acima; nunca em broadcast.

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPI de sucesso (§1)
- [x] Entradas e saídas rastreáveis (§3, §4)
- [ ] Regras codificadas em DB/server (§5)
- [ ] Workflow em `workflow_definitions` (§6)
- [ ] Eventos emitidos por trigger (§7)
- [ ] Integração via `ErpAdapter` (§8)
- [ ] UX com drawer + timeline + estados cobertos (§9)
- [ ] Agente IA com escopo/guardrail (§10)
- [ ] KPI derivado de eventos (§11)
- [ ] RLS + GRANT verificados (§12)
- [ ] Design Review V13 aprovado
- [ ] QA V12 verde
- [ ] Release checklist H7-05 executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V2, V5, V6, V7, V8, V9, V10, V11, V13
- **H2 Domain:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3 Architecture:** H3-01, H3-02, H3-03, H3-04
- **H4 Frontend:** H4-01, H4-02, H4-04, H4-05
- **H5 IA:** H5-02, H5-03, H5-05
- **H6 Integrações:** H6-02, H6-05
- **H7 Qualidade:** H7-02, H7-03, H7-05
- **H8 Ops:** H8-04

## 15. Competitive Notes (V14)

| PLM | Como resolve este elo | Limitação | Como superamos |
|-----|-----------------------|-----------|----------------|
| Centric | "Assortment Planning" pesado, telas separadas do dev | Fricção coordenador↔PCP | Wave em uma tela, promoção 1-clique do showroom |
| PTC FlexPLM | Workflow rígido baseado em Windchill | Baixa aderência BR | Workflow em tabela, edição sem redeploy |
| Lectra Kubix | Bom em pré-coleção, fraco em handoff ERP | Integração custom | `ErpAdapter` padronizado + idempotência |
| Gerber Yunique | Foco em desenvolvimento, sem lançamento | Reinvenção fora | Ciclo fechado até `sell_through` |
| Collection Moda | Forte no comercial BR | Rastreabilidade fraca | Timeline unificada + eventos |
| Audaces Idea | Foco em modelagem/corte | Sem visão comercial | Wave conectada ao mostruário |

**Padrão comum:** wave desconectada do desenvolvimento e do ERP.
**Nossa aposta:** promoção 1-clique showroom→wave, handoff idempotente, timeline única, sugestão de IA sobre feedback estruturado.

## 16. Riscos e mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Duplicar SKU/preço no PLM | alto | média | Adapter obrigatório; campos proibidos |
| Handoff duplicado no ERP | alto | baixa | `idempotency_key` + `payload_hash` |
| Vazamento de meta via realtime | médio | média | Tópicos escopados; payload mínimo |
| Item lançado sem decisão aprovada | alto | baixa | Trigger de validação |
| Cron sem auth | alto | baixa | HMAC obrigatório |

## 17. Changelog do playbook

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-08 | 0.1 | Squad PLM | criação (🟡 parcial, aguarda migração+server fns) |
