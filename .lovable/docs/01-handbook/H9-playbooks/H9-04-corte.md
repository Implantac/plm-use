# H9-04 · Corte

> Playbook do elo **Corte** — do encaixe validado (H9-03) + ordem de
> produção (H9-08) até os **fardos etiquetados prontos para costura**
> (H9-10), com rendimento real, sobras e defeitos de tecido registrados.
> Usa o template canônico `H9-00-template.md`.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM modela/decide/rastreia;
> ERP executa/contabiliza. Toda leitura/escrita de estoque, PO, NF, custo,
> preço e financeiro passa por `ErpAdapter` (H6-02), nunca tabela local.

## 0. Identificação

- **Elo da cadeia (V2):** Encaixe validado + OP liberada → **Enfesto →
  Corte → Separação → Etiquetagem → Fardos** → Costura
- **Código do playbook:** H9-04
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **Personas (V1):** Encarregado de Corte, Enfestador, Cortador, Separador,
  Especialista Corte, Especialista PCP, Especialista Qualidade,
  Especialista MRP
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Especialista Corte
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Transformar rolo de tecido em fardos de peças cortadas** com rendimento
real medido, rastreabilidade por lote e defeitos identificados antes de
descer para costura — evitando gargalo e retrabalho em H9-10.

- Resultado esperado: fardos etiquetados por lote/tamanho/cor,
  `cut_orders.status='concluida'`, consumo real conciliado com o previsto
  do encaixe, sobras baixadas no estoque.
- KPIs de sucesso (V10):
  - **Rendimento real vs. previsto do encaixe** (desvio ≤ 3 pp).
  - **% de OPs cortadas no prazo do PCP** (≥ 95%).
  - **% de defeitos de tecido detectados antes da costura** (≥ 90%).

## 2. Escopo

- **Faz parte:** planejamento de enfesto, recebimento de tecido na sala
  de corte, enfesto (colchão), corte, separação por tamanho/cor,
  etiquetagem, formação de fardo, conciliação de consumo, registro de
  defeitos, baixa de estoque de tecido.
- **Não faz parte:** compra de tecido (H9-06), encaixe/marker (H9-03),
  costura (H9-10), qualidade final da peça (H9-12).
- **Elo anterior:** H9-08 · PCP & APS (OP liberada) e H9-03 · Modelagem
  (encaixe aceito).
- **Elo posterior:** H9-10 · Costura & Facções.

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | OP liberada para corte | H9-08 | `production_orders.status='liberada_corte'` | SIM |
| 2 | Encaixe aceito | H9-03 | `markers.status='aceito'` (yield, consumo/m) | SIM |
| 3 | Grade e mix de tamanhos por OP | H9-08 | `production_order_sizes` | SIM |
| 4 | Estoque de tecido disponível | ERP via `ErpAdapter` (V9) | `queryErp('fabric_stock')` | SIM |
| 5 | Ficha de tecido (largura útil, encolhimento) | H9-06 / ERP | `queryErp('fabric_specs')` | SIM |
| 6 | Capacidade da sala de corte | H9-08 | vagas de enfesto/dia | SIM |
| 7 | Padrões de defeito conhecidos | H9-12 | tabela `defect_catalog` | recomendado |

Rastreabilidade: `entity_relations` (H2-06) — `production_order` →
`cut_order` → `spread` → `cut_bundle`.

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | Ordem de corte criada | Sala de Corte | `cut_orders` + `cut_order.created` | SIM |
| 2 | Enfesto planejado/executado | Cortador | `spreads` + `spread.executed` | SIM |
| 3 | Consumo real de tecido | ERP / MRP (H9-06) | `spreads.consumed_m` + `spread.consumption.reconciled` | SIM |
| 4 | Fardos etiquetados | H9-10 | `cut_bundles` + `bundle.labeled` | SIM |
| 5 | Defeitos de tecido registrados | H9-12 | `cut_defects` + `cut.defect.registered` | condicional |
| 6 | OP de corte concluída | H9-10 | `cut_orders.status='concluida'` + `cut_order.completed` | SIM |
| 7 | Baixa de estoque de tecido | ERP via `ErpAdapter` | `writeErp('fabric_movement')` | SIM |
| 8 | Timeline pública | UI (EntityTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** `cut_orders` só pode ser criada se existir `markers.aceito`
  vinculado à referência **e** OP com `status='liberada_corte'`.
- **R2:** `spread.executed` exige `consumed_m > 0` e `layers > 0`; consumo
  total do enfesto = `layers × marker.length_m × (1 + encolhimento)`.
- **R3:** Desvio absoluto entre consumo real e previsto do encaixe
  acima de 5 pp obriga `spread.justification` preenchida.
- **R4:** Nenhum `cut_bundle` pode ser marcado `labeled` sem
  `size`, `color`, `pieces_count > 0` e `spread_id` associado.
- **R5:** `cut_orders.status='concluida'` exige **soma dos
  `cut_bundles.pieces_count`** ≥ meta de peças da OP (com tolerância
  configurável por categoria).
- **R6:** Baixa no ERP (`writeErp('fabric_movement')`) é **idempotente**
  por `cut_order_id + spread_id` (chave única no ERP adapter — H6-02).
- **R7:** `cut_defect` acima de X% da metragem do enfesto dispara CAPA
  automaticamente (H9-12) — regra em trigger, não só no client.

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB — trigger `check_cut_order_prereqs` | migration H9-04 |
| R2 | DB — trigger `enforce_spread_math` | migration H9-04 |
| R3 | DB — trigger `require_justification_on_deviation` | migration H9-04 |
| R4 | DB — CHECK + trigger `validate_bundle_labels` | migration H9-04 |
| R5 | DB — trigger `check_cut_order_completion` | migration H9-04 |
| R6 | Server fn — chave de idempotência no `ErpAdapter` (H6-02) | `src/lib/erp/*.functions.ts` |
| R7 | DB — trigger `open_capa_on_high_defect_rate` | migration H9-04 |

## 6. Workflow (V8 / H2-05)

**Ordem de corte (`entity_type='cut_order'`):**

```text
planejada → em_enfesto → em_corte → em_separacao → em_etiquetagem → concluida
                                             ↓
                                         com_ocorrencia → em_correcao → em_separacao
                                             ↓
                                         cancelada
```

**Enfesto (`entity_type='spread'`):**

```text
planejado → em_execucao → executado → reconciliado
                                ↓
                            reprovado → planejado (re-enfesto)
```

- Máquinas em `workflow_definitions`.
- Transição `concluida` gated por R5 (server).
- Transição `reconciliado` gated por R2/R3.

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `cut_order.created`                | INSERT `cut_orders` | production_order_id, ref, meta_pcs | Timeline, BI, PCP |
| `spread.planned`                   | INSERT `spreads` | cut_order_id, layers, marker_id | Cortador |
| `spread.executed`                  | status → `executado` | spread_id, consumed_m, operator | BI |
| `spread.consumption.reconciled`    | conciliação com previsto | spread_id, delta_pp, justification? | MRP, BI |
| `bundle.labeled`                   | INSERT/UPDATE `cut_bundles` | spread_id, size, color, pieces_count | H9-10 |
| `cut.defect.registered`            | INSERT `cut_defects` | spread_id, tipo, metragem | H9-12 |
| `cut.capa.opened`                  | R7 aciona CAPA | cut_order_id, defect_rate | H9-12 |
| `cut_order.completed`              | status → `concluida` | cut_order_id, total_pieces | H9-10, BI |
| `cut_order.cancelled`              | status → `cancelada` | cut_order_id, motivo | PCP |
| `fabric.movement.written`          | R6 baixa no ERP | cut_order_id, ref_erp, m | ERP, BI |

Consumidores: `EntityTimeline`, `LoteTimeline`, `use-entity-events`,
`TorreDeControle`, `LivePCPWidget`.

## 8. Integrações (H6)

- **ERP (H6-02):** `queryErp('fabric_stock')` e `queryErp('fabric_specs')`
  para leitura; `writeErp('fabric_movement')` para baixa idempotente (R6).
- **CAD/PDM (H6-03):** leitura do `marker` (largura, comprimento, mapa
  do encaixe) via `patterns`/`markers` — sem duplicar arquivo CAD.
- **E-commerce (H6-04):** N/A.
- **Webhooks/Cron (H6-05):** cron a cada 15 min publica em `pcp-live`
  o progresso das OPs de corte em execução; webhook do coletor de sala
  (leitor de código de barras/RFID) atualiza `bundle.labeled` de forma
  idempotente por código.

## 9. UX (V4 / H4)

- **Rota principal:** `/production` (subseção *Corte*) reusando
  `TorreDeControle`, `LotesGantt`, `KanbanColumn`.
- **Drawer contextual:** `CutOrderDrawer` (novo, análogo a
  `ReferenciaDrawer`) com tabs *Encaixe · Enfesto · Fardos · Defeitos
  · Timeline · Relações · IA*.
- **Componentes reutilizados:** `EntityTimeline`, `EntityRelations`,
  `WorkflowStatusMenu`, `LoteTimeline`, `KanbanColumn`, `ErpBadge`,
  `LivePCPWidget`.
- **Componentes novos (mínimos):** `SpreadPlanTable`, `SpreadExecCard`,
  `BundleGridTable`, `CutDefectForm`.
- **Fluxo em cliques (H4-04):** abrir OP → criar ordem de corte →
  planejar enfesto → executar → etiquetar fardos → concluir.
  **Máx. 10 cliques** no caso feliz.
- **Estados:** vazio, carregando, erro, sucesso — todos cobertos.
  Coletor de sala funciona offline com fila local (H4-05).

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Especialista Corte* — critica plano de enfesto vs. capacidade e
    sugere ordem de execução para reduzir troca de tecido.
  - *Especialista PCP* — antecipa impacto de atraso do corte na costura.
  - *Especialista MRP* — cruza consumo real vs. saldo de tecido e alerta
    ruptura projetada.
  - *Especialista Qualidade* — reconhece padrões de defeito recorrente
    por fornecedor de tecido (link com H9-12).
- **Perguntas que os agentes devem responder:**
  - "Qual sequência de enfesto minimiza troca de tecido hoje?"
  - "Qual fornecedor tem maior taxa de defeito por metro?"
  - "Qual OP de corte está no caminho crítico para não atrasar a costura?"
- **Contexto vivo (H5-02):** `cut_orders`, `spreads`, `cut_bundles`,
  `cut_defects`, `markers`, `production_orders`, `entity_events`,
  `ErpAdapter.queryErp('fabric_stock')`.
- **Guardrails:** IA nunca libera OP, nunca aprova enfesto, nunca dá baixa
  em estoque. Toda sugestão vira comentário `ai_suggested=true`.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Desvio de consumo vs. encaixe | (`consumed_m` − previsto) ÷ previsto | pp | ≤ 3 | Corte |
| OPs cortadas no prazo | `cut_order.completed` até `pcp_due` ÷ total | % | ≥ 95% | PCP |
| Taxa de defeito de tecido detectado no corte | m defeituoso ÷ m enfestado | % | ≤ 5% | Qualidade |
| Aderência de peças cortadas à meta | `Σ pieces_count` ÷ meta_pcs | % | ≥ 99% | Corte |
| Tempo médio de enfesto por rolo | Σ tempo enfesto ÷ nº rolos | min | ≤ meta interna | Corte |

Fonte: derivados de `entity_events` + `cut_orders` + `spreads` + `cut_bundles`.
Sem contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `cut_orders`, `spreads`, `cut_bundles`, `cut_defects`,
  `defect_catalog` — policy por ação, escopo por `is_member` + `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar ordem de corte: `encarregado_corte`, `especialista_pcp`
  - planejar/executar enfesto: `enfestador`, `especialista_corte`
  - registrar defeito: qualquer papel da sala de corte
  - etiquetar fardo: `cortador`, `separador`, `encarregado_corte`
  - concluir OP de corte: `encarregado_corte`
  - editar `defect_catalog`: `especialista_qualidade`
- **PII/dado sensível:** N/A neste elo. Custos de tecido são sensíveis
  (H9-06) — não são exibidos aqui, apenas consumo/metragem.

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPIs (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow (ordem de corte + enfesto) em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via `ErpAdapter` idempotente (§8)
- [x] UX com drawer + timeline + estados cobertos (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPIs derivados de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`cut_orders`, `spreads`, `cut_bundles`,
      `cut_defects`, `defect_catalog`, triggers, workflow)
- [ ] Server fn de baixa `writeErp('fabric_movement')` idempotente
- [ ] Webhook do coletor de sala (`/api/public/cut-collector`) com HMAC
- [ ] Componentes novos (`SpreadPlanTable`, `SpreadExecCard`,
      `BundleGridTable`, `CutDefectForm`) implementados
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E OP liberada → OP de corte concluída (H7-03)
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
- **H6:** H6-02 (ERP idempotente), H6-05 (webhook coletor)
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Cut planning acoplado a marker do CAD | Requer suite CAD proprietária | Encaixe agnóstico + baixa ERP idempotente |
| PTC FlexPLM | Cut order + shop-floor via módulos separados | Alto custo de integração | Coletor de sala via webhook público simples |
| Lectra Kubix / Vector | Salas de corte automatizadas, benchmarks | Ecossistema fechado | Rendimento real como KPI vivo, aberto |
| Gerber Yunique / AccuMark | Marker + cut room integrados | UI legada | Timeline em tempo real + drawer contextual |
| Collection Moda (BR) | Ficha de corte manual, planilha | Sem conciliação automática de consumo | R3 justificativa + reconciliação evento-a-evento |
| Audaces Neocut | Corte automatizado + gestão de sala | Não é PLM — não amarra à cadeia | Este playbook amarra corte à Digital Thread |

Padrão mental comum: **corte = enfesto + consumo + fardos etiquetados**,
com rendimento medido. Nossa superação: **baixa ERP idempotente + CAPA
automática por defeito + fila offline no coletor + IA multi-especialista**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Baixa duplicada no ERP | Estoque negativo, prejuízo | média | R6 idempotência + testes contract H7 |
| Enfesto executado sem encaixe aceito | Consumo descontrolado | baixa | R1 trigger |
| Consumo real muito acima do previsto sem justificativa | Custo estourado | alta | R3 + KPI §11 monitorado |
| Fardo etiquetado errado | Costura da grade errada | média | R4 + validação do coletor (HMAC + código único) |
| Defeito de tecido só descoberto na costura | Retrabalho caro | alta | Registro no corte + R7 CAPA + agente Qualidade |
| Perda de dados por queda de rede na sala | Ordem sem baixa | média | Fila offline no coletor + reconciliação por evento |
| IA sugerir sequência que quebra prioridade do PCP | Atraso | baixa | Guardrail §10 + agente PCP valida |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
