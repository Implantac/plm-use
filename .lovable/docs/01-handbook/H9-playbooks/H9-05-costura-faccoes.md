# H9-05 · Costura & Facções

> Playbook do elo **Costura** — dos fardos etiquetados (H9-04) até as
> **peças costuradas prontas para acabamento** (H9-06), executadas
> internamente ou em facção, com produtividade, qualidade em linha e
> rastreabilidade por passagem.
> Usa o template canônico `H9-00-template.md`.

---

## 0. Identificação

- **Elo da cadeia (V2):** Fardos etiquetados → **Distribuição para célula
  ou facção → Passagens → Costura → Inspeção em linha → Peças costuradas**
  → Lavanderia/Acabamento
- **Código do playbook:** H9-05
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **Personas (V1):** Encarregado de Costura, Costureira, Líder de Célula,
  Encarregado de Facção, Especialista Costura, Especialista Facções,
  Especialista Cronoanálise, Especialista Qualidade, Especialista PCP
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Especialista Costura /
  Especialista Facções
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Transformar fardos cortados em peças costuradas** — internamente ou em
facção — com produtividade medida por passagem, qualidade validada em
linha e rastreabilidade de todo lote, mesmo fora dos muros da fábrica.

- Resultado esperado: `sewing_orders.status='concluida'`, peças
  contabilizadas por tamanho/cor, ocorrências fechadas, saldo por facção
  reconciliado.
- KPIs de sucesso (V10):
  - **Eficiência real vs. tempo padrão** por célula/facção (≥ 85%).
  - **% de OPs costuradas no prazo do PCP** (≥ 95%).
  - **Taxa de retorno para retrabalho** (≤ 3%).
  - **Rastreabilidade externa** — % de lotes em facção com passagem
    registrada nas últimas 24h (≥ 98%).

## 2. Escopo

- **Faz parte:** distribuição do fardo (interno/facção), roteiro de
  passagens (operações), apontamento por operação, inspeção em linha,
  ocorrências de costura, retorno de facção, reconciliação de peças,
  fechamento da OP de costura.
- **Não faz parte:** corte (H9-04), lavanderia/acabamento (H9-06),
  qualidade final (H9-07), engenharia de tempo padrão base (H9-03/H9-08).
- **Elo anterior:** H9-04 · Corte
- **Elo posterior:** H9-06 · Lavanderia & Acabamento

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Fardos etiquetados | H9-04 | `cut_bundles.status='labeled'` | SIM |
| 2 | OP de costura liberada | H9-08 | `production_orders.status='liberada_costura'` | SIM |
| 3 | Roteiro de operações (tempo padrão) | H9-03 / Cronoanálise | `sewing_routes` (operação, tempo, seq) | SIM |
| 4 | Capacidade de célula/facção | H9-08 | `capacity_slots` por semana | SIM |
| 5 | Cadastro de facções ativas | ERP via `ErpAdapter` (V9) | `queryErp('suppliers?type=faccao')` | SIM |
| 6 | SLA por facção | Comercial/Suppliers | `supplier_slas` (lead time, preço peça) | SIM |
| 7 | Padrões de defeito conhecidos | H9-07 | `defect_catalog` | recomendado |

Rastreabilidade: `entity_relations` (H2-06) —
`production_order` → `sewing_order` → `sewing_batch` → `sewing_passage`.

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | OP de costura criada | Célula/Facção | `sewing_orders` + `sewing_order.created` | SIM |
| 2 | Lote enviado para facção | Facção | `sewing_batches` + `batch.sent_to_faccao` | condicional |
| 3 | Passagem registrada por operação | Timeline / BI | `sewing_passages` + `passage.registered` | SIM |
| 4 | Ocorrência de costura | H9-07, célula | `sewing_occurrences` + `sewing.occurrence.opened` | condicional |
| 5 | Retorno de facção conciliado | Estoque WIP | `batch.returned` + `batch.reconciled` | SIM (se faccão) |
| 6 | OP de costura concluída | H9-06 | `sewing_orders.status='concluida'` + `sewing_order.completed` | SIM |
| 7 | Fatura de facção pronta para conferência | Financeiro / ERP | `writeErp('faccao_invoice_ready')` | SIM (se facção) |
| 8 | Timeline pública | UI (EntityTimeline / LoteTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** `sewing_orders` só é criável se existir fardo com
  `cut_bundles.status='labeled'` associado à mesma `production_order`.
- **R2:** `passage.registered` exige `operator_id` **ou** `faccao_id`,
  `pieces_count > 0` e `operation_id` presente em `sewing_routes`.
- **R3:** Uma passagem só pode registrar peças ≤ peças da passagem
  anterior (roteiro sequencial); exceção com `passage.override=true`
  exige `has_role(auth.uid(),'especialista_costura')` + justificativa.
- **R4:** `batch.sent_to_faccao` gera saldo em `faccao_open_balance`;
  `batch.returned` exige quantidade compatível com o enviado
  (`|returned - sent| ≤ tolerância_por_categoria`) — divergência abre
  ocorrência automática (R7).
- **R5:** `sewing_orders.status='concluida'` exige soma de peças da
  última operação do roteiro ≥ meta da OP (com tolerância) e nenhuma
  ocorrência crítica aberta.
- **R6:** Chamada `writeErp('faccao_invoice_ready')` é **idempotente**
  por `sewing_order_id + faccao_id + return_batch_id` (H6-02).
- **R7:** Divergência de retorno de facção acima de X% dispara CAPA
  automática (H9-07) — regra em trigger.
- **R8:** Toda passagem em facção só é aceita se vier assinada por HMAC
  do webhook (`/api/public/sewing-collector`) ou registrada por usuário
  autenticado com `has_role('encarregado_faccao')`.

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB — trigger `check_sewing_order_prereqs` | migration H9-05 |
| R2 | DB — CHECK + trigger `validate_passage_payload` | migration H9-05 |
| R3 | DB — trigger `enforce_route_sequence` | migration H9-05 |
| R4 | DB — trigger `reconcile_faccao_batch` | migration H9-05 |
| R5 | DB — trigger `check_sewing_order_completion` | migration H9-05 |
| R6 | Server fn — chave idempotência no `ErpAdapter` (H6-02) | `src/lib/erp/*.functions.ts` |
| R7 | DB — trigger `open_capa_on_batch_divergence` | migration H9-05 |
| R8 | Server route pública com HMAC (H6-05) | `src/routes/api/public/sewing-collector.ts` |

## 6. Workflow (V8 / H2-05)

**OP de costura (`entity_type='sewing_order'`):**

```text
planejada → em_distribuicao → em_producao → em_inspecao → concluida
                                      ↓
                                  com_ocorrencia → em_correcao → em_producao
                                      ↓
                                  cancelada
```

**Lote em facção (`entity_type='sewing_batch'`, quando `faccao_id IS NOT NULL`):**

```text
preparado → enviado → em_producao_externa → retornado → reconciliado
                                       ↓
                                   atrasado → escalado → em_producao_externa
                                       ↓
                                   com_divergencia → em_ajuste → reconciliado
```

- Máquinas em `workflow_definitions`.
- `sewing_order.concluida` gated por R5 (server).
- `sewing_batch.reconciliado` gated por R4/R7.
- Transição `atrasado` disparada por cron quando `now() > sla_due` (H6-05).

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `sewing_order.created`         | INSERT `sewing_orders` | production_order_id, cell/faccao | Timeline, BI, PCP |
| `batch.prepared`               | INSERT `sewing_batches` | order_id, bundle_ids[] | Cell/Facção |
| `batch.sent_to_faccao`         | envio efetivado | batch_id, faccao_id, pieces, sla_due | Facção, BI |
| `passage.registered`           | INSERT `sewing_passages` | batch_id, operation_id, operator/faccao, pieces | BI, cronoanálise |
| `sewing.occurrence.opened`     | INSERT `sewing_occurrences` | batch_id, tipo, responsável | H9-07 |
| `sewing.occurrence.resolved`   | ocorrência fechada | occurrence_id | Timeline |
| `batch.returned`               | volta da facção | batch_id, returned_pieces | Estoque WIP |
| `batch.reconciled`             | conciliação OK | batch_id, delta_pieces | Financeiro |
| `sewing.capa.opened`           | R7 aciona CAPA | batch_id, divergence_pct | H9-07 |
| `sewing_order.completed`       | status → `concluida` | order_id, total_pieces | H9-06, BI |
| `sewing_order.cancelled`       | status → `cancelada` | order_id, motivo | PCP |
| `faccao.invoice.ready`         | R6 aciona ERP | order_id, faccao_id, ref_erp | Financeiro |
| `batch.late`                   | cron detecta SLA vencido | batch_id, days_late | Suppliers, PCP |

Consumidores: `EntityTimeline`, `LoteTimeline`, `use-entity-events`,
`TorreDeControle`, `LivePCPWidget`, `SupplierScoreboard`.

## 8. Integrações (H6)

- **ERP (H6-02):** `queryErp('suppliers?type=faccao')`, `queryErp('supplier_slas')`
  para leitura; `writeErp('faccao_invoice_ready')` idempotente (R6).
- **CAD/PDM (H6-03):** N/A — roteiro/tempo padrão vem de `sewing_routes`,
  não do CAD.
- **E-commerce (H6-04):** N/A.
- **Webhooks/Cron (H6-05):**
  - `POST /api/public/sewing-collector` — coletor de célula ou terminal
    da facção, assinado por HMAC (R8), idempotente por `passage_id`.
  - Cron 15/15 min publica em `pcp-live` OPs de costura em execução.
  - Cron horário marca `batch.late` quando `now() > sla_due`.

## 9. UX (V4 / H4)

- **Rota principal:** `/production` (subseção *Costura*) reusando
  `TorreDeControle`, `LotesGantt`, `KanbanColumn`.
- **Rota dedicada de facções:** `/suppliers` reusando `SupplierScoreboard`.
- **Drawer contextual:** `SewingOrderDrawer` (novo, análogo a
  `ReferenciaDrawer`) com tabs *Roteiro · Lotes · Passagens · Facção
  · Ocorrências · Timeline · Relações · IA*.
- **Componentes reutilizados:** `EntityTimeline`, `EntityRelations`,
  `WorkflowStatusMenu`, `LoteTimeline`, `LoteCard`, `KanbanColumn`,
  `PassagemForm`, `OcorrenciaForm`, `ErpBadge`, `SupplierScoreboard`,
  `LivePCPWidget`.
- **Componentes novos (mínimos):** `RouteStepsTable`, `PassageEntryDrawer`,
  `FaccaoBalanceCard`, `BatchReconcileDialog`.
- **Fluxo em cliques (H4-04):** abrir OP → distribuir fardo (célula ou
  facção) → registrar passagem por operação → conciliar retorno →
  concluir OP. **Máx. 10 cliques** no caso feliz.
- **Estados:** vazio, carregando, erro, sucesso — todos cobertos.
  Coletor com fila offline (H4-05).

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Especialista Costura* — critica balanceamento da célula por
    operação com base em tempo padrão vs. real.
  - *Especialista Facções* — recomenda melhor facção por categoria
    considerando SLA, preço, histórico de divergência.
  - *Especialista Cronoanálise* — sinaliza operações com tempo padrão
    defasado (real cronicamente > padrão em > N% dos apontamentos).
  - *Especialista PCP* — antecipa impacto de atraso da costura no
    acabamento e mostruário.
  - *Especialista Qualidade* — cruza ocorrência com combinação
    tecido × modelagem × facção.
- **Perguntas que os agentes devem responder:**
  - "Qual facção está mais confiável para essa categoria hoje?"
  - "Qual operação está travando a célula X?"
  - "Qual OP de costura está no caminho crítico?"
  - "Quais tempos padrão precisam ser revisitados?"
- **Contexto vivo (H5-02):** `sewing_orders`, `sewing_batches`,
  `sewing_passages`, `sewing_routes`, `sewing_occurrences`,
  `supplier_slas`, `entity_events`,
  `ErpAdapter.queryErp('suppliers?type=faccao')`.
- **Guardrails:** IA nunca escolhe facção sozinha, nunca aprova
  divergência, nunca dá baixa em ERP. Toda sugestão vira comentário
  `ai_suggested=true`.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Eficiência real vs. padrão | (Σ pcs × tempo padrão) ÷ (horas reais × 60) | % | ≥ 85% | Costura |
| OPs no prazo | `sewing_order.completed` até `pcp_due` ÷ total | % | ≥ 95% | PCP |
| Taxa de retrabalho | ocorrências `retrabalho` ÷ total OPs | % | ≤ 3% | Qualidade |
| Rastreabilidade externa | facção com `passage.registered` < 24h ÷ facções ativas | % | ≥ 98% | Suppliers |
| Divergência média por facção | Σ `|returned - sent|` ÷ `Σ sent` | % | ≤ 1% | Suppliers |
| Lead time médio de facção | `batch.reconciled` − `batch.sent_to_faccao` | dias | ≤ SLA | Facções |

Fonte: derivados de `entity_events` + `sewing_*` + ERP. Sem contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `sewing_orders`, `sewing_batches`, `sewing_passages`,
  `sewing_routes`, `sewing_occurrences`, `supplier_slas` — policy por
  ação, escopo por `is_member` + `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar OP de costura: `encarregado_costura`, `especialista_pcp`
  - registrar passagem interna: `costureira`, `lider_celula`, `encarregado_costura`
  - registrar passagem em facção: webhook HMAC ou `encarregado_faccao`
  - abrir ocorrência: qualquer papel da linha
  - conciliar retorno (R4): `encarregado_costura`, `especialista_faccoes`
  - concluir OP (R5): `encarregado_costura`
  - override sequência (R3): `especialista_costura`
- **PII/dado sensível:** dados de custo/preço da facção são sensíveis
  (H9-06/Financeiro) — visíveis apenas a `especialista_faccoes` e
  diretoria. Terminal de facção nunca vê custo de outras facções (RLS
  por `faccao_id = current_faccao()`).

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPIs (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow (OP + lote-facção) em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via `ErpAdapter` idempotente + webhook HMAC (§8)
- [x] UX com drawer + timeline + estados cobertos (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPIs derivados de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`sewing_orders`, `sewing_batches`,
      `sewing_passages`, `sewing_routes`, `sewing_occurrences`,
      `supplier_slas`, triggers, workflow)
- [ ] Server route `/api/public/sewing-collector` com HMAC
- [ ] Server fn `writeErp('faccao_invoice_ready')` idempotente
- [ ] Componentes novos (`RouteStepsTable`, `PassageEntryDrawer`,
      `FaccaoBalanceCard`, `BatchReconcileDialog`) implementados
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E fardo → OP concluída (interno e facção) (H7-03)
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
- **H6:** H6-02 (ERP idempotente), H6-05 (webhook facção)
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Sourcing + shop floor via módulos separados | Alto custo, integração longa | Facção como cidadão de 1ª classe no PLM |
| PTC FlexPLM | Vendor management robusto | Complexo para PMEs | Webhook HMAC simples + coletor offline |
| Lectra Kubix Link | Foco em CAD e material, fraco em facção | Não cobre bem outsourcing | R4 conciliação + R7 CAPA automática |
| Gerber Yunique | Colaboração global com fornecedores | UI legada, sem tempo real | Timeline em tempo real + `SupplierScoreboard` |
| Collection Moda (BR) | Controle de facção via planilha/WhatsApp | Sem rastreabilidade eventos | Passagem obrigatória a cada 24h como KPI vivo |
| Audaces | Não cobre gestão de facção | — | Este playbook cobre o gap na cadeia BR |

Padrão mental comum: **costura = distribuição + passagem + conciliação**,
interno ou externo. Nossa superação: **facção com mesmo rigor de célula
interna, webhook seguro, IA multi-especialista e KPI de rastreabilidade
externa a cada 24h**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Lote sumir em facção | Prejuízo + atraso | alta | R4 conciliação + `batch.late` cron + KPI rastreabilidade externa |
| Passagem falsa (peças infladas) | Fatura errada | média | R3 sequência + R8 HMAC + auditoria por evento |
| Divergência aceita sem análise | Perda contínua | média | R7 CAPA + agente Facções |
| Facção sem SLA cadastrado | Sem cobrança de prazo | baixa | R1/R2 exigem `sewing_routes` e cadastro |
| Fatura duplicada no ERP | Prejuízo financeiro | média | R6 idempotência + testes contract H7 |
| Vazamento de custo entre facções | Legal/competitivo | baixa | RLS por `faccao_id` no terminal |
| IA escolher facção enviesada | Contrato desigual | baixa | Guardrail §10 — IA sugere, humano decide |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
