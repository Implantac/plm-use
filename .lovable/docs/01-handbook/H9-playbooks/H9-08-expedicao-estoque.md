# H9-08 · Expedição & Controle de Estoque de PA

Segue **imediatamente após** H9-07 (Qualidade & CAPA / SKU aprovado). Cobre
a jornada do SKU aprovado até o embarque: entrada em estoque de PA,
alocação por pedido, picking, conferência, embalagem de expedição e
liberação do embarque.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM **orquestra e rastreia**
> a expedição (checklists, eventos, workflow, evidência); o **ERP é o
> sistema de estoque e fiscal**. Saldo de PA, reservas, NF, romaneio
> contábil e movimentações financeiras vivem no ERP e são lidos/escritos
> **exclusivamente** via `ErpAdapter` (H6-02). O PLM nunca soma saldo,
> nunca emite documento fiscal e nunca mantém tabela espelho de estoque.

---

## 0. Identificação

- **Elo da cadeia (V2):** Expedição & Controle de Estoque de PA
- **Código do playbook:** H9-08
- **Volume(s) FPEF relacionados:** V2, V5, V6, V7, V8, V9, V10, V11
- **Personas envolvidas (V1):** Expedição, Almoxarife de PA, PCP,
  Comercial (para ver alocação), Financeiro (leitura), Transportadora
- **Estado:** 🟡 parcial
- **Autor / Revisor:** Handbook Team / Logística
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

Garantir que **cada SKU aprovado** vire embarque correto (item certo,
quantidade certa, pedido certo, transportadora certa, prazo certo)
com rastreabilidade ponta a ponta e sem duplicar o estoque que já é
governado pelo ERP.

- **Resultado esperado ao fim do elo:** carga liberada, romaneio/NF
  emitidos no ERP, evento `shipment.dispatched` registrado no PLM.
- **Métrica de sucesso (KPI, V10):** `on_time_shipping ≥ 97%`,
  `picking_accuracy ≥ 99.5%`, `stock_divergence ≤ 0.5%`.

## 2. Escopo

- **Faz parte:** recebimento do SKU aprovado, entrada em PA via ERP
  (idempotente), alocação a pedidos, geração de ondas de picking,
  conferência (checklist + evidência), embalagem de expedição, coleta
  pela transportadora, disparo da emissão fiscal no ERP.
- **Não faz parte:** vendas / pedido comercial (H9-12 · Mostruário &
  Comercial), emissão fiscal e cálculo de impostos (ERP), transporte em
  si (transportadora externa), pós-venda (H9-14).
- **Elo anterior:** H9-07 · Qualidade & CAPA
- **Elo posterior:** H9-14 · Pós-venda & Aprendizado

## 3. Entradas (inputs)

| #   | Entrada                                                  | Origem (elo/sistema)          | Formato                       | Obrigatória? |
| --- | -------------------------------------------------------- | ----------------------------- | ----------------------------- | ------------ |
| 1   | SKU aprovado + qty (`sku.released`)                      | H9-07                         | evento `entity_events`        | Sim          |
| 2   | Pedido comercial (cliente, itens, prazo, transportadora) | ERP via `ErpAdapter`          | contrato H6-02                | Sim          |
| 3   | Saldo de PA vigente                                      | ERP via `ErpAdapter.getStock` | contrato H6-02                | Sim          |
| 4   | Regra de alocação (FIFO/FEFO/prioridade cliente)         | Config PLM                    | `shipment_allocation_rule`    | Sim          |
| 5   | Endereço de entrega + janela                             | ERP (pedido)                  | contrato H6-02                | Sim          |
| 6   | Checklist de conferência da família/canal                | Config Qualidade              | `shipment_checklist_template` | Sim          |
| 7   | CAPA aberta bloqueando SKU (se houver)                   | H9-07                         | `quality_capa.status`         | Sim          |

Regras:

- Toda entrada rastreável a entidade do catálogo (H2-02).
- **Nunca** ler estoque/pedido do ERP direto — só via `ErpAdapter`
  (H6-02), com cache ≤ 60s.

## 4. Saídas (outputs)

| #   | Saída                                     | Destino (elo/sistema) | Entidade / Evento                                               | Obrigatória? |
| --- | ----------------------------------------- | --------------------- | --------------------------------------------------------------- | ------------ |
| 1   | Entrada em PA registrada no ERP           | ERP                   | `writeErp('pa_receipt')` + `pa.receipt.written`                 | Sim          |
| 2   | Onda de picking                           | Chão de expedição     | `shipment_wave` + `wave.opened`                                 | Sim          |
| 3   | Conferência aprovada por pedido           | PLM                   | `shipment_check` + `shipment.checked`                           | Sim          |
| 4   | Divergência de picking (SKU/qty)          | PLM + Qualidade       | `shipment.divergence.registered`                                | Condicional  |
| 5   | Solicitação de NF/romaneio ao ERP         | ERP                   | `writeErp('shipment_dispatch')` + `shipment.dispatch.requested` | Sim          |
| 6   | Coleta confirmada pela transportadora     | PLM                   | `shipment.dispatched`                                           | Sim          |
| 7   | Alerta ao Comercial sobre atraso previsto | PLM                   | `shipment.delay.alert`                                          | Condicional  |

Regras:

- Toda saída relevante emite `entity_events` (V7 / H2-04).
- Mudanças de estado passam por `workflow_definitions` (V8 / H2-05).
- **Nenhuma saída grava saldo, preço ou dado fiscal em `public.*`.**

## 5. Regras de negócio (V6)

- **R1 — Só embarca SKU aprovado:** o `shipment_item` só pode ser criado
  se existir `sku.released` (H9-07) para o `sku_id`/`batch_id` referido.
  CAPA aberta bloqueante (`severity=critical, status<>verificada`) impede
  alocação. Enforçado por `check_can_allocate_sku()` no server fn.
- **R2 — Entrada em PA idempotente via ERP:** `writeErp('pa_receipt')` usa
  `idempotency_key = batch_id:sku_id`. Replays não somam duas vezes.
  PLM **não** mantém tabela de saldo — sempre re-consulta
  `ErpAdapter.getStock` com cache ≤ 60s.
- **R3 — Alocação determinística:** dado o pedido, aplicar a regra
  configurada (FIFO por `pa_receipt.created_at`, FEFO por validade, ou
  prioridade cliente) — função pura no server. Operador não escolhe lote
  manualmente sem justificativa registrada em `payload.justification`.
- **R4 — Conferência exige checklist + evidência:** transição
  `em_conferencia → conferida` exige todos os itens do
  `shipment_checklist_template` marcados + ao menos 1 anexo (foto do
  volume fechado). Falta de qualquer item → transição rejeitada.
- **R5 — Divergência abre ocorrência automática:** se qty conferida ≠
  qty picking, evento `shipment.divergence.registered` cria
  `pcp_occurrences` com `source='expedicao'` e bloqueia
  `shipment.dispatch.requested` até resolução.
- **R6 — Emissão fiscal só via ERP, idempotente:**
  `writeErp('shipment_dispatch', { shipment_id, itens, transportadora })`
  com `idempotency_key = shipment_id`. PLM **nunca** monta payload de NF,
  **nunca** calcula imposto, **nunca** grava número de NF em `public.*`.
  Guarda apenas `erp_dispatch_id` + `erp_synced_at`.
- **R7 — Coleta exige comprovante:** transição `aguardando_coleta →
despachado` exige `carrier_ref` (código do conhecimento) e evidência
  (foto/PDF). Sem isso, sem `shipment.dispatched`.
- **R8 — Sem espelhar estoque nem financeiro:** proibido em qualquer
  `public.*` deste elo: `stock_qty`, `price`, `cost`, `nf_number`,
  `nf_serie`, `nf_value`, `ap_amount`. Se aparecer, é bug de escopo.
- **R9 — Alerta de atraso preditivo:** se `promised_at - now() < SLA` e
  ainda em `separacao|em_conferencia`, emite `shipment.delay.alert` para
  o comercial (uma vez por shipment). Não abre CAPA automática — atraso
  é operacional, não de qualidade.

Onde cada regra é aplicada:

| Regra | Camada                    | Referência de código                                    |
| ----- | ------------------------- | ------------------------------------------------------- |
| R1    | server fn + DB check      | `allocateSku.functions.ts` + `check_can_allocate_sku()` |
| R2    | server fn                 | `writePaReceipt.functions.ts` (usa `ErpAdapter`)        |
| R3    | server fn                 | `allocateOrder.functions.ts`                            |
| R4    | DB (check) + server fn    | `closeShipmentCheck.functions.ts`                       |
| R5    | trigger DB                | `trg_shipment_divergence`                               |
| R6    | server fn                 | `requestErpDispatch.functions.ts`                       |
| R7    | server fn                 | `markDispatched.functions.ts`                           |
| R8    | code review + lint schema | migration + PR check                                    |
| R9    | cron (H6-05)              | `shipment_delay_watchdog` cron a cada 15 min            |

## 6. Workflow (V8)

Duas máquinas em `workflow_definitions` polimórfico.

**`shipment` (documento de expedição por pedido/onda):**

```text
criada → alocada → em_separacao → em_conferencia → conferida
                                                 ↘ divergente → em_conferencia
       → aguardando_coleta → despachado
                            ↘ cancelada
```

**`shipment_wave` (agrupamento de picking):**

```text
aberta → em_execução → concluída
                     ↘ pausada → em_execução
```

- Máquina registrada em `workflow_definitions`? SIM (`shipment`, `shipment_wave`).
- Transições proibidas: `criada → despachado` (pula tudo); `divergente →
aguardando_coleta` (precisa reconferir); `qualquer → despachado` sem
  `erp_dispatch_id`.
- Quem pode transicionar:
  - alocar / abrir onda / picking / conferir → `expedicao`
  - resolver divergência → `expedicao` + `pcp`
  - solicitar NF ao ERP → `expedicao` (mas o ERP é quem emite)
  - marcar despachado → `expedicao` (com `carrier_ref`)

## 7. Eventos emitidos (V7)

| `event_type`                     | Quando                  | Payload mínimo                               | Consumido por   |
| -------------------------------- | ----------------------- | -------------------------------------------- | --------------- |
| `pa.receipt.written`             | R2 sucesso no ERP       | `{sku_id, qty, batch_id, erp_id}`            | BI, PCP         |
| `shipment.created`               | pedido virou expedição  | `{order_id, promised_at, carrier}`           | Comercial       |
| `wave.opened`                    | onda criada             | `{wave_id, itens_count}`                     | Torre expedição |
| `pick.registered`                | item bipado no picking  | `{sku_id, qty, wave_id}`                     | Auditoria       |
| `shipment.checked`               | R4 atendida             | `{checklist_id, actor, evidence_url}`        | BI              |
| `shipment.divergence.registered` | R5 disparada            | `{expected_qty, actual_qty, sku_id}`         | PCP, Comercial  |
| `shipment.dispatch.requested`    | R6 aceita no ERP        | `{erp_dispatch_id}`                          | ERP, Comercial  |
| `shipment.dispatched`            | R7 atendida             | `{carrier_ref, dispatched_at, evidence_url}` | BI, Cliente     |
| `shipment.delay.alert`           | R9 disparada            | `{shipment_id, promised_at, current_state}`  | Comercial       |
| `shipment.cancelled`             | cancelamento com motivo | `{reason_code, actor}`                       | BI              |

## 8. Integrações (H6)

- **ERP (H6-02) — o parceiro central deste elo:**
  - `getStock(sku_id)` — saldo por SKU (cache 60s).
  - `getPurchaseOrder`/pedido de venda — para itens e SLA.
  - `writeErp('pa_receipt', ...)` — idempotente por `batch_id:sku_id`.
  - `writeErp('shipment_dispatch', ...)` — idempotente por `shipment_id`.
  - `getInvoice(erp_dispatch_id)` — leitura sob demanda, nunca cache > 60s.
- **CAD/PDM (H6-03):** N/A — expedição não consome CAD.
- **E-commerce (H6-04):** indireto — quando o ERP emite NF, o e-commerce
  já reflete estoque via seu próprio contrato; PLM não sincroniza estoque
  para e-commerce diretamente.
- **Webhooks/Cron (H6-05):**
  - Cron `shipment_delay_watchdog` a cada 15 min (R9).
  - `POST /api/public/carrier-callback` (HMAC) para transportadora
    confirmar coleta ou reportar exceção; idempotente por
    `x-idempotency-key`. Só grava evento, nunca estoque.

## 9. UX (V4 / H4)

- **Rota(s):** `/shipping` (torre de expedição), `/shipping/wave/:id`
  (drawer da onda), `/shipping/shipment/:id` (drawer da expedição).
- **Componentes contextuais:** `EntityDrawer`, `EntityTimeline`,
  `EntityRelations`, `WorkflowStatusMenu`, `ChecklistPanel`,
  `CommentsPanel`, `ErpBadge` (mostra `erp_dispatch_id` + selo "fonte:
  ERP" para reforçar fronteira).
- **Fluxo em cliques (H4-04):** operador abre onda → bipa itens
  (picking) → botão "Conferir" abre checklist → "Confirmar coleta" com
  `carrier_ref`; ≤ 8 cliques para o caso feliz.
- **Estados:** vazio, carregando, erro, divergente, aguardando ERP,
  aguardando coleta, atrasado — todos cobertos? SIM.

## 10. IA (V11 / H5)

- **Agente(s) responsáveis (V13):**
  - **Especialista Expedição:** sugere sequência de picking por
    proximidade física / prioridade de SLA.
  - **Especialista PCP:** consultado quando divergência recorrente
    aponta problema em H9-06 (embalagem) ou H9-07 (qualidade).
  - **Especialista Comercial (leitura):** responde "quando meu pedido
    embarca?" com base em `shipment.*` — nunca promete data que não
    esteja no ERP.

- **Perguntas típicas:**
  - "Quais pedidos vão furar SLA hoje?"
  - "Qual transportadora tem mais divergência este mês?"
  - "Por que a onda X está pausada?"

- **Contexto vivo (H5-02):** `shipment`, `shipment_wave`,
  `entity_events` (`shipment.*`, `wave.*`) + snapshot ERP via adapter
  (nunca cópia local).

- **Guardrails:**
  - IA **não** escreve no ERP.
  - IA **não** altera estado de shipment.
  - IA **não** promete data fora do SLA do ERP.
  - IA **não** libera SKU com CAPA bloqueante.

## 11. BI (V10)

| KPI                       | Fórmula                                                | Unidade | Meta   | Responsável |
| ------------------------- | ------------------------------------------------------ | ------- | ------ | ----------- |
| On-time shipping          | `shipments.despachado_no_prazo / shipments.despachado` | %       | ≥ 97   | Expedição   |
| Picking accuracy          | `1 - (divergences / total_picks)`                      | %       | ≥ 99.5 | Expedição   |
| Stock divergence          | `abs(pa_receipt - erp_saldo_esperado) / erp_saldo`     | %       | ≤ 0.5  | Almox + PCP |
| Ciclo pedido→embarque     | mediana(`dispatched_at - shipment.created`)            | horas   | ≤ 24   | Expedição   |
| SLA carrier callback      | callbacks recebidos ≤ 2h / total                       | %       | ≥ 95   | Log/TI      |
| Cancelamento pós-alocação | `shipments.cancelled_pos_alocada / total`              | %       | ≤ 1    | Comercial   |

Fonte: derivado de `entity_events` (`shipment.*`, `wave.*`, `pa.receipt.*`)

- leitura sob demanda do ERP via adapter. **Nunca contagem manual, nunca
  cópia local de saldo.**

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `shipment`, `shipment_wave`, `shipment_check`,
  `shipment_item` com policies `is_member(auth.uid())` + `has_role`.
  SIM.
- **GRANT:** toda tabela pública com `GRANT SELECT, INSERT, UPDATE,
DELETE ... TO authenticated` + `GRANT ALL ... TO service_role`. `anon`
  sem acesso. SIM.
- **Papéis autorizados (`has_role`):** `expedicao`, `almoxarife_pa`,
  `pcp`, `comercial` (leitura), `financeiro` (leitura).
- **PII / dado sensível tratado:** endereço de entrega vem do ERP e não
  é copiado para `public.*` — mostrado sob demanda via adapter, com log
  de acesso em `activity_log`. Callback da transportadora com HMAC
  (H6-05) e verificação de assinatura no receptor.

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPI de sucesso definidos (§1)
- [x] Entradas e saídas rastreáveis a entidades (§3, §4)
- [x] Regras de negócio codificadas em DB/server (§5)
- [x] Workflow em `workflow_definitions` (§6)
- [x] Eventos declarados e emitidos (§7)
- [x] Integrações via adapter/contrato (§8)
- [x] UX com drawer + timeline + estados cobertos (§9)
- [x] Agente IA com escopo e guardrails (§10)
- [x] KPI catalogado e derivado de eventos (§11)
- [x] RLS + GRANT verificados (§12)
- [x] Fronteira PLM × ERP explicitada e respeitada (§0/§5 R8)
- [ ] Design Review (V13 · 10 perguntas) aprovado
- [ ] QA (V12 · 12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V2, V5, V6, V7, V8, V9, V10, V11, V12, V13
- **H2 Domain:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3 Architecture:** H3-01, H3-02, H3-03, H3-04, H3-05
- **H4 Frontend:** H4-01, H4-02, H4-04, H4-05
- **H5 IA:** H5-02, H5-03, H5-05
- **H6 Integrações:** H6-02, H6-05
- **H7 Qualidade:** H7-01, H7-04, H7-05
- **H8 Ops:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM             | Como resolve este elo                  | Limitação                                    | Como superamos                               |
| --------------- | -------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Centric         | Não cobre expedição, delega ao WMS/ERP | Fronteira nítida, mas sem timeline unificada | PLM orquestra + timeline única sem virar WMS |
| PTC FlexPLM     | Idem, delega                           | Falta rastreabilidade cruzada até o embarque | `entity_events` liga qualidade→embarque      |
| Lectra Kubix    | Não cobre                              | —                                            | H9-08 orquestra sem duplicar ERP             |
| Gerber Yunique  | Módulo de "ship tracking" leve         | Duplica campos de ERP                        | Só `erp_id + erp_synced_at`, resto no ERP    |
| Collection Moda | Cobre expedição no próprio ERP         | ERP + PLM misturados                         | Separação estrita via `ErpAdapter`           |
| Audaces Idea    | Não cobre                              | —                                            | Playbook nativo                              |

Padrão mental comum: expedição ou é ignorada pelo PLM (perde-se
rastreabilidade), ou é duplicada dentro dele (vira ERP paralelo).
Nossa aposta: **orquestrar sem espelhar** — checklist, evento e workflow
no PLM; saldo, NF e financeiro no ERP.

## 16. Riscos e mitigação

| Risco                                      | Impacto    | Probabilidade | Mitigação                                               |
| ------------------------------------------ | ---------- | ------------- | ------------------------------------------------------- |
| PLM começar a manter saldo local           | Muito alto | Média         | R8 lista campos proibidos; PR bloqueado                 |
| Dupla emissão de NF por replay             | Alto       | Baixa         | R6 idempotência por `shipment_id`                       |
| Divergência silenciosa picking×conferência | Alto       | Média         | R5 trigger + ocorrência automática                      |
| Callback transportadora sem HMAC           | Alto       | Baixa         | HMAC obrigatório na rota `/api/public/carrier-callback` |
| Atraso não comunicado ao comercial         | Médio      | Alta          | R9 cron watchdog + evento                               |
| Endereço de cliente vazando em log         | Alto       | Baixa         | Nunca copia para `public.*`, acesso auditado            |

## 17. Changelog do playbook

| Data       | Versão | Autor         | Mudança              |
| ---------- | ------ | ------------- | -------------------- |
| 2026-07-07 | 0.1    | Handbook Team | criação (🟡 parcial) |
