# H9-06 · Lavanderia & Acabamento

> Playbook do elo **Lavanderia & Acabamento** — das peças costuradas
> (H9-05) até as **peças acabadas, revisadas e embaladas**, prontas para
> a inspeção final de qualidade (H9-07) e o mostruário/expedição.
> Cobre lavagem/tingimento/estonagem (interna ou terceira), passadoria,
> acabamentos manuais (aviamentos finais, botão, etiqueta) e embalagem.
> Usa o template canônico `H9-00-template.md`.

---

## 0. Identificação

- **Elo da cadeia (V2):** Peças costuradas → **Lavanderia (lavagem /
  tingimento / estonagem) → Passadoria → Acabamento manual → Revisão →
  Embalagem** → Qualidade final
- **Código do playbook:** H9-06
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **Personas (V1):** Encarregado de Lavanderia, Operador de Lavagem,
  Passadeira, Acabadeira, Revisor, Embalador, Especialista Lavanderia,
  Especialista Acabamento, Especialista Qualidade, Especialista PCP,
  Especialista Facções (para lavanderia terceirizada)
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Especialista Lavanderia /
  Especialista Acabamento
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Transformar peças costuradas em peças acabadas vendáveis** — com
efeito de lavagem correto, medidas dentro de tolerância pós-encolhimento,
acabamentos manuais completos, revisão em linha aprovada e embalagem
padronizada — mantendo rastreabilidade lote a lote mesmo quando a
lavanderia é terceira.

- Resultado esperado: `finishing_orders.status='concluida'`, peças
  embaladas por SKU (ref + cor + tamanho), receita de lavanderia
  aplicada e conferida, saldo com lavanderia externa reconciliado.
- KPIs de sucesso (V10):
  - **% de peças no efeito-alvo no 1º ciclo** de lavagem (≥ 90%).
  - **Encolhimento real vs. tolerância** por receita (dentro da faixa).
  - **% de OPs de acabamento no prazo do PCP** (≥ 95%).
  - **Taxa de retorno para reprocesso** (≤ 2%).
  - **Rastreabilidade externa** — % de lotes em lavanderia terceira com
    passagem registrada nas últimas 24h (≥ 98%).

## 2. Escopo

- **Faz parte:** planejamento da receita de lavagem/tingimento/estonagem,
  envio para lavanderia (interna ou terceira), execução do ciclo,
  medição de encolhimento e efeito, passadoria, acabamento manual
  (aviamento final, botão, etiqueta, marca), revisão em linha,
  embalagem em SKU, reconciliação com lavanderia externa.
- **Não faz parte:** costura (H9-05), inspeção final AQL de qualidade
  (H9-07), mostruário/expedição (H9-12/13), compras de aviamentos e
  químicos (H9-10).
- **Elo anterior:** H9-05 · Costura & Facções
- **Elo posterior:** H9-07 · Qualidade & CAPA

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Peças costuradas concluídas | H9-05 | `sewing_orders.status='concluida'` + `sewing_batches` reconciliados | SIM |
| 2 | OP de acabamento liberada | H9-08 | `production_orders.status='liberada_acabamento'` | SIM |
| 3 | Receita de lavanderia/efeito | H9-09 (Engenharia) | `wash_recipes` (produto, dosagem, tempo, tolerâncias) | SIM |
| 4 | Ficha de acabamentos | H9-09 | `finishing_specs` (aviamento final, medidas alvo) | SIM |
| 5 | Cadastro de lavanderias ativas | ERP via `ErpAdapter` (V9) | `queryErp('suppliers?type=lavanderia')` | SIM (se terceira) |
| 6 | SLA por lavanderia | Suppliers | `supplier_slas` (lead time, preço peça, capacidade) | SIM (se terceira) |
| 7 | Estoque de aviamentos finais e químicos | ERP via `ErpAdapter` | `queryErp('finishing_stock')` | SIM |
| 8 | Padrão de defeito (respingo, esgarçamento, encolhimento) | H9-07 | `defect_catalog` | recomendado |

Rastreabilidade: `entity_relations` (H2-06) — `production_order` →
`finishing_order` → `finishing_batch` → `finishing_step` (lavagem,
passadoria, acabamento, revisão, embalagem) → `pack_unit`.

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | OP de acabamento criada | Lavanderia / Célula | `finishing_orders` + `finishing_order.created` | SIM |
| 2 | Lote enviado para lavanderia terceira | Lavanderia externa | `finishing_batches` + `batch.sent_to_lavanderia` | condicional |
| 3 | Ciclo de lavagem executado | Timeline / BI | `finishing_steps` (kind=`wash`) + `wash.executed` | SIM |
| 4 | Medição de encolhimento/efeito | H9-07 | `wash_measurements` + `wash.measured` | SIM |
| 5 | Passagem/acabamento/revisão registrados | Timeline / BI | `finishing_steps` (kind=`press`/`finish`/`review`) + `finishing.step.registered` | SIM |
| 6 | Ocorrência de acabamento | H9-07 | `finishing_occurrences` + `finishing.occurrence.opened` | condicional |
| 7 | Peças embaladas por SKU | H9-11 (estoque acabado) | `pack_units` + `pack.registered` | SIM |
| 8 | Retorno de lavanderia conciliado | Estoque WIP | `batch.returned` + `batch.reconciled` | SIM (se terceira) |
| 9 | OP de acabamento concluída | H9-07 / Expedição | `finishing_orders.status='concluida'` + `finishing_order.completed` | SIM |
| 10 | Baixa de químicos/aviamentos no ERP | ERP | `writeErp('finishing_movement')` (idempotente) | SIM |
| 11 | Fatura de lavanderia pronta para conferência | Financeiro | `writeErp('lavanderia_invoice_ready')` | SIM (se terceira) |
| 12 | Timeline pública | UI (EntityTimeline / LoteTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** `finishing_orders` só é criável se existir lote com
  `sewing_orders.status='concluida'` associado à mesma `production_order`
  **e** `wash_recipes` obrigatória preenchida.
- **R2:** `wash.executed` exige `recipe_id`, `duration_min > 0`,
  `temp_c`, `chemicals_json` (composição real aplicada) e `operator/faccao`.
- **R3:** `wash.measured` obriga registrar encolhimento e efeito em
  peças-amostra por tamanho (mín. 1 por tamanho da grade); fora da
  tolerância da `wash_recipe` bloqueia avanço e abre ocorrência (R7).
- **R4:** `pack.registered` exige `sku` (ref+cor+tamanho), `qty > 0`,
  `finishing_batch_id`, e soma total ≤ peças que entraram na OP menos
  reprovas registradas (evita “peças fantasmas”).
- **R5:** `finishing_orders.status='concluida'` exige:
  (a) todas etapas da receita executadas (`wash`, `press`, `finish`,
  `review`);
  (b) medição dentro da tolerância;
  (c) nenhuma ocorrência crítica aberta;
  (d) soma de `pack_units.qty` ≥ meta − tolerância da OP.
- **R6:** `batch.reconciled` (lavanderia externa) exige
  `|returned - sent| ≤ tolerância_lavanderia`; divergência abre CAPA
  automática (R7).
- **R7:** Divergência de retorno acima do limite, encolhimento fora da
  faixa ou taxa de reprova acima de X% disparam CAPA automática (H9-07)
  — regra em trigger.
- **R8:** `writeErp('finishing_movement')` e `writeErp('lavanderia_invoice_ready')`
  são idempotentes por `(finishing_order_id, batch_id, kind)` (H6-02).
- **R9:** Toda passagem em lavanderia terceira só é aceita se vier
  assinada por HMAC do webhook (`/api/public/finishing-collector`) ou
  registrada por usuário autenticado com
  `has_role('encarregado_lavanderia_externa')`.
- **R10:** Trocar `wash_recipe` de uma OP em execução é proibido — obriga
  cancelar a OP e criar nova versão (imutabilidade da receita aplicada).

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB — trigger `check_finishing_order_prereqs` | migration H9-06 |
| R2 | DB — CHECK + trigger `validate_wash_payload` | migration H9-06 |
| R3 | DB — trigger `enforce_wash_measurement_tolerance` | migration H9-06 |
| R4 | DB — trigger `validate_pack_units` | migration H9-06 |
| R5 | DB — trigger `check_finishing_order_completion` | migration H9-06 |
| R6 | DB — trigger `reconcile_lavanderia_batch` | migration H9-06 |
| R7 | DB — trigger `open_capa_on_finishing_deviation` | migration H9-06 |
| R8 | Server fn — chave idempotência no `ErpAdapter` (H6-02) | `src/lib/erp/*.functions.ts` |
| R9 | Server route pública com HMAC (H6-05) | `src/routes/api/public/finishing-collector.ts` |
| R10 | DB — trigger `prevent_recipe_swap_when_running` | migration H9-06 |

## 6. Workflow (V8 / H2-05)

**OP de acabamento (`entity_type='finishing_order'`):**

```text
planejada → em_distribuicao → em_lavagem → em_medicao → em_passadoria →
em_acabamento → em_revisao → em_embalagem → concluida
                        ↓
                    com_ocorrencia → em_correcao → (etapa correspondente)
                        ↓
                    cancelada
```

**Lote em lavanderia externa (`entity_type='finishing_batch'`, quando
`lavanderia_id IS NOT NULL`):**

```text
preparado → enviado → em_lavagem_externa → retornado → reconciliado
                                       ↓
                                   atrasado → escalado → em_lavagem_externa
                                       ↓
                                   com_divergencia → em_ajuste → reconciliado
```

- Máquinas em `workflow_definitions`.
- Transição `concluida` gated por R5 (server).
- Transição `reconciliado` gated por R6/R7.
- Transição `atrasado` disparada por cron quando `now() > sla_due` (H6-05).

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `finishing_order.created`      | INSERT `finishing_orders` | production_order_id, recipe_id, faccao/interno | Timeline, BI, PCP |
| `batch.prepared`               | INSERT `finishing_batches` | order_id, sewing_batch_ids[] | Lavanderia |
| `batch.sent_to_lavanderia`     | envio efetivado | batch_id, lavanderia_id, pieces, sla_due | Suppliers, BI |
| `wash.executed`                | `finishing_steps.kind='wash'` | batch_id, recipe_id, duration_min, temp_c | BI, Qualidade |
| `wash.measured`                | `wash_measurements` gravada | batch_id, shrink_pct[], efeito | BI, Qualidade |
| `finishing.step.registered`    | passadoria/acabamento/revisão | batch_id, kind, operator, pieces | BI, cronoanálise |
| `finishing.occurrence.opened`  | INSERT `finishing_occurrences` | batch_id, tipo, responsável | H9-07 |
| `finishing.occurrence.resolved`| ocorrência fechada | occurrence_id | Timeline |
| `pack.registered`              | INSERT `pack_units` | batch_id, sku, qty | H9-11, BI |
| `batch.returned`               | volta da lavanderia | batch_id, returned_pieces | Estoque WIP |
| `batch.reconciled`             | conciliação OK | batch_id, delta_pieces | Financeiro |
| `finishing.capa.opened`        | R7 aciona CAPA | batch_id, motivo | H9-07 |
| `finishing_order.completed`    | status → `concluida` | order_id, total_packed | H9-07/H9-11, BI |
| `finishing_order.cancelled`    | status → `cancelada` | order_id, motivo | PCP |
| `finishing.movement.written`   | baixa químicos/aviamentos no ERP | order_id, ref_erp | ERP, BI |
| `lavanderia.invoice.ready`     | R8 aciona ERP | order_id, lavanderia_id, ref_erp | Financeiro |
| `batch.late`                   | cron detecta SLA vencido | batch_id, days_late | Suppliers, PCP |

Consumidores: `EntityTimeline`, `LoteTimeline`, `use-entity-events`,
`TorreDeControle`, `LivePCPWidget`, `SupplierScoreboard`.

## 8. Integrações (H6)

- **ERP (H6-02):** `queryErp('suppliers?type=lavanderia')`,
  `queryErp('supplier_slas')`, `queryErp('finishing_stock')` para leitura;
  `writeErp('finishing_movement')` e `writeErp('lavanderia_invoice_ready')`
  idempotentes (R8).
- **CAD/PDM (H6-03):** N/A — receita e ficha vêm de H9-09.
- **E-commerce (H6-04):** N/A — só depois da inspeção final H9-07 e
  entrada em estoque acabado H9-11.
- **Webhooks/Cron (H6-05):**
  - `POST /api/public/finishing-collector` — coletor da lavanderia
    interna/externa e terminal de sala; assinado por HMAC (R9),
    idempotente por `step_id`.
  - Cron 15/15 min publica em `pcp-live` OPs de acabamento em execução.
  - Cron horário marca `batch.late` quando `now() > sla_due`.

## 9. UX (V4 / H4)

- **Rota principal:** `/production` (subseção *Acabamento & Lavanderia*)
  reusando `TorreDeControle`, `LotesGantt`, `KanbanColumn`.
- **Rota dedicada de lavanderias:** `/suppliers` (filtro
  `type='lavanderia'`) reusando `SupplierScoreboard`.
- **Drawer contextual:** `FinishingOrderDrawer` (novo, análogo a
  `SewingOrderDrawer`) com tabs *Receita · Lotes · Lavagem · Medições ·
  Passadoria/Acabamento · Revisão · Embalagem · Ocorrências · Timeline
  · Relações · IA*.
- **Componentes reutilizados:** `EntityTimeline`, `EntityRelations`,
  `WorkflowStatusMenu`, `LoteTimeline`, `LoteCard`, `KanbanColumn`,
  `PassagemForm`, `OcorrenciaForm`, `ErpBadge`, `SupplierScoreboard`,
  `LivePCPWidget`, `CapaDrawer`, `DefectHeatmap`.
- **Componentes novos (mínimos):** `WashRecipeCard`, `WashMeasurementForm`,
  `FinishingStepEntryDrawer`, `PackUnitTable`, `LavanderiaBalanceCard`.
- **Fluxo em cliques (H4-04):** abrir OP → escolher receita → enviar
  lote (interno/lavanderia) → registrar ciclo → medir → passar/acabar
  → revisar → embalar → concluir. **Máx. 12 cliques** no caso feliz.
- **Estados:** vazio, carregando, erro, sucesso — todos cobertos.
  Coletor com fila offline (H4-05).

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Especialista Lavanderia* — recomenda receita para atingir efeito-alvo
    com base em histórico de tecido × lavagem × resultado.
  - *Especialista Acabamento* — critica ficha de acabamento vs. tempo
    padrão e sugere reordenação de linha.
  - *Especialista Qualidade* — cruza encolhimento/efeito com padrão de
    defeito por lavanderia (link com H9-07).
  - *Especialista Facções (lavanderia)* — recomenda melhor lavanderia
    por receita considerando SLA, preço, histórico de divergência.
  - *Especialista PCP* — antecipa impacto de atraso no mostruário/expedição.
  - *Especialista Custo/Margem* — mostra impacto da dosagem real de
    químicos no custo unitário (link com H9-13 custo & margem).
- **Perguntas que os agentes devem responder:**
  - "Qual receita atinge o tom pretendido nesse tecido?"
  - "Qual lavanderia tem menor divergência para essa receita?"
  - "Qual OP de acabamento está no caminho crítico para o mostruário?"
  - "Qual receita está gastando químico acima do esperado?"
- **Contexto vivo (H5-02):** `finishing_orders`, `finishing_batches`,
  `finishing_steps`, `wash_measurements`, `wash_recipes`,
  `finishing_specs`, `pack_units`, `finishing_occurrences`, `entity_events`,
  `ErpAdapter.queryErp('finishing_stock' | 'suppliers?type=lavanderia')`.
- **Guardrails:** IA nunca aprova receita, nunca aceita medição fora da
  faixa, nunca conclui OP, nunca dá baixa em ERP. Toda sugestão vira
  comentário `ai_suggested=true`.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Acerto de efeito no 1º ciclo | `wash.measured` OK ÷ total `wash.executed` | % | ≥ 90% | Lavanderia |
| Encolhimento fora da faixa | `wash_measurements` fora da tolerância ÷ total | % | ≤ 5% | Qualidade |
| OPs no prazo | `finishing_order.completed` até `pcp_due` ÷ total | % | ≥ 95% | PCP |
| Taxa de reprocesso | ocorrências `reprocesso` ÷ total OPs | % | ≤ 2% | Qualidade |
| Rastreabilidade externa | lavanderia com `finishing.step.registered` < 24h ÷ ativas | % | ≥ 98% | Suppliers |
| Divergência média por lavanderia | Σ `|returned - sent|` ÷ `Σ sent` | % | ≤ 1% | Suppliers |
| Custo real de químicos por SKU | `finishing.movement.written` ÷ `Σ pack_units.qty` | R$/pç | ≤ meta H9-13 | Custo/Margem |
| Lead time lavanderia externa | `batch.reconciled` − `batch.sent_to_lavanderia` | dias | ≤ SLA | Suppliers |

Fonte: derivados de `entity_events` + `finishing_*` + ERP. Sem contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `finishing_orders`, `finishing_batches`, `finishing_steps`,
  `wash_recipes`, `wash_measurements`, `finishing_specs`,
  `finishing_occurrences`, `pack_units` — policy por ação, escopo por
  `is_member` + `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar OP: `encarregado_lavanderia`, `especialista_pcp`
  - registrar `wash.executed`: `operador_lavagem`, `encarregado_lavanderia_externa` (via HMAC)
  - registrar `wash.measured`: `operador_lavagem`, `especialista_qualidade`
  - registrar passadoria/acabamento/revisão: `passadeira`, `acabadeira`, `revisor`
  - registrar embalagem: `embalador`, `encarregado_lavanderia`
  - conciliar retorno (R6): `encarregado_lavanderia`, `especialista_faccoes`
  - concluir OP (R5): `encarregado_lavanderia`
  - editar `wash_recipes`: `especialista_lavanderia` + `coordenador_engenharia`
  - editar `defect_catalog`: `especialista_qualidade`
- **PII/dado sensível:** preço por peça da lavanderia é sensível
  (Financeiro/H9-13) — visível só a `especialista_faccoes` e diretoria.
  Terminal de lavanderia externa nunca vê preço de outras lavanderias
  (RLS por `lavanderia_id = current_lavanderia()`).
- **PII de operador (interno):** apenas nome de identificação da linha;
  dados pessoais não expostos no drawer/timeline.

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPIs (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow (OP + lote-lavanderia) em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via `ErpAdapter` idempotente + webhook HMAC (§8)
- [x] UX com drawer + timeline + estados cobertos (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPIs derivados de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`finishing_orders`, `finishing_batches`,
      `finishing_steps`, `wash_recipes`, `wash_measurements`,
      `finishing_specs`, `finishing_occurrences`, `pack_units`,
      triggers, workflow)
- [ ] Server route `/api/public/finishing-collector` com HMAC
- [ ] Server fns `writeErp('finishing_movement')` e
      `writeErp('lavanderia_invoice_ready')` idempotentes
- [ ] Componentes novos (`WashRecipeCard`, `WashMeasurementForm`,
      `FinishingStepEntryDrawer`, `PackUnitTable`, `LavanderiaBalanceCard`)
      implementados
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E costura concluída → embalagem (interno e lavanderia
      externa) (H7-03)
- [ ] Design Review V13 (10 perguntas) assinado
- [ ] QA V12 (12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **H1:** H1-01, H1-04, H1-05
- **H2:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3:** H3-01, H3-02, H3-03, H3-04, H3-05
- **H4:** H4-01, H4-02, H4-04, H4-05
- **H5:** H5-02, H5-03, H5-05
- **H6:** H6-02 (ERP idempotente), H6-05 (webhook lavanderia)
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Trata acabamento como etapa genérica de shop-floor | Sem receita de lavanderia estruturada | `wash_recipes` + medição obrigatória com tolerância |
| PTC FlexPLM | Módulo Wash/Finishing como add-on | Alto custo, longa implantação | Nativo, com CAPA automática por desvio |
| Lectra Kubix Link | Foco em CAD/material, fraco em lavanderia | Não cobre outsourcing de lavanderia | Lavanderia como cidadão de 1ª classe com HMAC |
| Gerber Yunique | Colaboração global, sem foco em receita de lavagem | Sem tempo real | Timeline evento-a-evento + `SupplierScoreboard` |
| Collection Moda (BR) | Ficha de acabamento textual + planilha para lavanderia | Sem rastreabilidade e sem KPI vivo | Rastreabilidade externa a cada 24h como KPI |
| Audaces | Não cobre lavanderia/acabamento | — | Este playbook cobre gap na cadeia BR (jeans em especial) |

Padrão mental comum: **acabamento = receita + medição + embalagem SKU**.
Nossa superação: **receita imutável durante a execução (R10), medição
obrigatória com tolerância, CAPA automática por desvio, lavanderia externa
com mesmo rigor da interna, webhook seguro e IA multi-especialista**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Efeito de lavagem fora do alvo | Retrabalho / peça perdida | alta | R3 medição obrigatória + agente Lavanderia |
| Encolhimento maior que tolerância | Peça fora da grade | alta | R3 bloqueia avanço + R7 CAPA |
| Lote sumir em lavanderia externa | Prejuízo + atraso | alta | R6 conciliação + `batch.late` cron + KPI rastreabilidade externa |
| Passagem falsa (peças infladas) | Fatura errada | média | R2/R4 + R9 HMAC + auditoria por evento |
| Divergência aceita sem análise | Perda contínua | média | R7 CAPA + agente Facções (lavanderia) |
| Troca de receita durante execução | Perda de rastreabilidade | baixa | R10 imutabilidade |
| Fatura duplicada no ERP | Prejuízo financeiro | média | R8 idempotência + testes contract H7 |
| Vazamento de preço entre lavanderias | Legal/competitivo | baixa | RLS por `lavanderia_id` no terminal |
| IA sugerir receita nova sem base | Desperdício químico | baixa | Guardrail §10 — IA sugere, humano aprova |
| Peças embaladas em SKU errado | Erro de expedição | média | R4 validação + revisão em linha antes da embalagem |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
