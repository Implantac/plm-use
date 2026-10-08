# H9-07 · Qualidade & CAPA (Inspeção final por SKU + ações corretivas)

Segue **imediatamente após** H9-06 (Lavanderia & Acabamento / Embalagem por SKU)
e antecede H9-13 (Expedição). É o **último portão** antes do estoque de PA:
nenhum SKU embalado vira estoque comercial sem passar por AQL aqui, e todo
defeito recorrente vira **CAPA** com dono, prazo e verificação de eficácia.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM modela/decide/rastreia;
> ERP executa/contabiliza. Toda leitura/escrita de estoque, PO, NF, custo,
> preço e financeiro passa por `ErpAdapter` (H6-02), nunca tabela local.

## 0. Identificação

- **Elo da cadeia (V2):** Qualidade final + CAPA (Corrective & Preventive Action)
- **Código do playbook:** H9-07
- **Volume(s) FPEF relacionados:** V2, V5, V6, V7, V8, V10, V11, V12
- **Personas envolvidas (V1):** Inspetor de Qualidade, Coordenador de Qualidade,
  Gerente Industrial, PCP, Facção (quando o defeito é externo), Engenharia
- **Estado:** 🟡 parcial
- **Autor / Revisor:** Handbook Team / Qualidade
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

Garantir que **cada SKU embalado** atenda ao padrão de qualidade acordado
(AQL 2.5 por padrão) antes de virar estoque disponível, e transformar
**todo defeito recorrente** em ação corretiva rastreável (CAPA) com
verificação de eficácia — fechando o ciclo Detectar → Conter → Investigar
→ Corrigir → Prevenir → Verificar.

- **Resultado esperado ao fim do elo:** lote/SKU **aprovado** e liberado
  para expedição, ou **reprovado** com destino claro (retrabalho, segunda
  linha, refugo) e CAPA aberta quando a causa raiz for sistêmica.
- **Métrica de sucesso (KPI, V10):** `first_pass_yield_final ≥ 97%`,
  `capa_efficacy_rate ≥ 85%`, `capa_median_close_days ≤ 15`.

## 2. Escopo

- **Faz parte:** amostragem AQL do lote embalado, registro de defeitos
  por SKU/tamanho, decisão aceita/retrabalha/refuga, abertura e
  acompanhamento de CAPA, verificação de eficácia, liberação para
  estoque de PA.
- **Não faz parte:** inspeção de matéria-prima recebida (é H9-11
  Estoque & Recebimento), qualidade em processo de costura
  (é H9-05 R7), qualidade em processo de lavanderia (é H9-06 R6/R7),
  laudos laboratoriais externos (integração via H6, mas execução externa).
- **Elo anterior:** H9-06 · Lavanderia & Acabamento (Embalagem por SKU)
- **Elo posterior:** H9-13 · Expedição & Logística

## 3. Entradas (inputs)

| #   | Entrada                                                           | Origem (elo/sistema)        | Formato                         | Obrigatória? |
| --- | ----------------------------------------------------------------- | --------------------------- | ------------------------------- | ------------ |
| 1   | Lote embalado por SKU (`finishing_batch` reconciliado)            | H9-06                       | `pcp_lots` + `entity_relations` | Sim          |
| 2   | Ficha técnica vigente (tolerâncias, medidas críticas, aviamentos) | H9-02 / `tech_sheets`       | jsonb versionado                | Sim          |
| 3   | Plano de amostragem AQL (nível/critério) por família              | Config Qualidade            | `quality_aql_plan`              | Sim          |
| 4   | Catálogo de defeitos (`defect_catalog`) com severidade            | Handbook Qualidade          | tabela `public.defect_catalog`  | Sim          |
| 5   | Histórico de CAPAs abertas na mesma referência/facção             | `quality_capa`              | tabela                          | Sim          |
| 6   | SLA/scorecard do fornecedor externo (se defeito é da facção)      | H9-05 / H9-06               | `supplier_scorecard`            | Não          |
| 7   | Snapshot ERP de estoque de PA destino                             | H6-02 `ErpAdapter.getStock` | contrato                        | Sim          |

Regras:

- Toda entrada rastreável a entidade do catálogo H2-02.
- ERP **sempre** via `ErpAdapter` (H6-02) — nunca query direta.

## 4. Saídas (outputs)

| #   | Saída                                              | Destino (elo/sistema) | Entidade / Evento                          | Obrigatória?      |
| --- | -------------------------------------------------- | --------------------- | ------------------------------------------ | ----------------- |
| 1   | Inspeção AQL registrada (aprovada/reprovada)       | Qualidade             | `quality_inspection` + `inspection.closed` | Sim               |
| 2   | Defeitos por SKU/posição/severidade                | Qualidade + BI        | `quality_defect` + `defect.registered`     | Sim               |
| 3   | CAPA aberta (quando causa sistêmica)               | Qualidade             | `quality_capa` + `capa.opened`             | Condicional       |
| 4   | Verificação de eficácia da CAPA                    | Qualidade             | `capa.verified` / `capa.reopened`          | Sim (para CAPA)   |
| 5   | SKU liberado para estoque de PA                    | H9-13 + ERP           | `sku.released` + `writeErp('pa_receipt')`  | Sim (se aprovado) |
| 6   | Solicitação de retrabalho / segunda linha / refugo | H9-06 ou almox        | `sku.rework_requested` / `sku.refuse`      | Condicional       |
| 7   | Alerta ao fornecedor externo com evidência         | H9-05 (facção)        | `faccao.quality.alert`                     | Condicional       |

Regras:

- Toda saída relevante emite `entity_events` (V7 / H2-04).
- Mudanças de estado passam por `workflow_definitions` (V8 / H2-05).

## 5. Regras de negócio (V6)

- **R1 — AQL obrigatória por lote embalado:** só é possível abrir
  `quality_inspection` se o `finishing_batch` estiver em `reconciliado`
  (H9-06). Nível e critério vêm de `quality_aql_plan` — nunca digitados
  no ato pelo inspetor.
- **R2 — Tamanho de amostra imutável no ato:** o `sample_size` é
  calculado pelo servidor a partir do tamanho do lote + AQL vigente e
  **congelado** no `quality_inspection.opened`. Ajuste posterior exige
  reabrir a inspeção (nova `inspection_id`).
- **R3 — Defeito exige catálogo + severidade + evidência:** todo
  `quality_defect` referencia `defect_catalog.id` (crítico/maior/menor),
  posição na peça e ao menos 1 anexo (foto). Sem os três → INSERT
  rejeitado por constraint.
- **R4 — Decisão determinística:** aprovação/reprovação é função pura
  da contagem por severidade vs limites do AQL. O inspetor **não pode
  aprovar manualmente** uma inspeção que a regra reprovou (função
  `apply_aql_decision()` roda no `.handler()`).
- **R5 — CAPA automática para defeito recorrente:** quando a mesma
  combinação `(reference_id, defect_code, source)` aparece em ≥ 2
  inspeções nos últimos 30 dias, o servidor abre `quality_capa`
  automaticamente e emite `capa.opened` com `trigger='recurrence'`.
- **R6 — CAPA tem dono, prazo e eficácia:** transição para `verificada`
  exige `verified_at`, `verified_by`, `evidence_url` e ao menos 1
  `quality_inspection` posterior com `first_pass_yield ≥ meta`. Sem
  isso, `can_transition` retorna false.
- **R7 — Liberação para PA é idempotente e via ERP adapter:**
  `writeErp('pa_receipt', { batch_id, sku_id, qty })` usa
  `idempotency_key = batch_id:sku_id` — replays não somam estoque duas
  vezes (H6-02).
- **R8 — Reprovação bloqueia expedição:** SKU com inspeção `reprovada`
  NÃO pode transicionar para `liberado_expedicao`. Bloqueio no DB via
  `workflow_definitions`, não só no client.
- **R9 — Alerta ao fornecedor externo com HMAC:** quando `source='faccao'`
  ou `source='lavanderia_externa'`, a saída para o portal externo passa
  por `/api/public/quality-notify` com verificação HMAC no receptor
  (mesmo padrão H6-05 / H9-05 R8).

Onde cada regra é aplicada:

| Regra | Camada                | Referência de código                             |
| ----- | --------------------- | ------------------------------------------------ |
| R1    | DB (CHECK + trigger)  | migration `quality_inspection_open_check`        |
| R2    | server fn             | `openInspection.functions.ts`                    |
| R3    | DB (constraint + FK)  | `quality_defect` schema                          |
| R4    | server fn             | `applyAqlDecision.functions.ts`                  |
| R5    | trigger DB            | `trg_capa_recurrence`                            |
| R6    | DB + `can_transition` | `workflow_definitions` (`capa`)                  |
| R7    | server fn             | `releaseSkuToPA.functions.ts` (usa `ErpAdapter`) |
| R8    | DB                    | `workflow_definitions` (`sku`)                   |
| R9    | server route          | `src/routes/api/public/quality-notify.ts`        |

## 6. Workflow (V8)

Duas máquinas, ambas em `workflow_definitions` polimórfico.

**`quality_inspection`:**

```text
aberta → em_execução → em_decisão → aprovada
                                  ↘ reprovada → retrabalho_solicitado
                                              ↘ refugada
```

**`capa`:**

```text
aberta → investigação → plano_de_ação → em_execução → verificada
                                                    ↘ reaberta → investigação
```

- Máquina registrada em `workflow_definitions`? SIM (entity_type
  `quality_inspection` e `capa`).
- Transições proibidas listadas? SIM — não existe aresta
  `em_decisão → aprovada` quando `apply_aql_decision()` retornou
  `reprovada`; não existe aresta `reprovada → aprovada` (sem reinspeção).
- Quem pode transicionar (papel / `has_role`):
  - `abrir/executar inspeção` → `inspetor_qualidade`
  - `decidir/reprovar` → `coordenador_qualidade`
  - `abrir/investigar CAPA` → `coordenador_qualidade`
  - `verificar eficácia` → `gerente_industrial`

## 7. Eventos emitidos (V7)

| `event_type`                   | Quando                              | Payload mínimo                                  | Consumido por    |
| ------------------------------ | ----------------------------------- | ----------------------------------------------- | ---------------- |
| `inspection.opened`            | AQL criada                          | `{sample_size, aql_level, batch_id}`            | BI, IA Qualidade |
| `inspection.defect.registered` | INSERT em `quality_defect`          | `{defect_code, severity, position, sku_id}`     | Heatmap, IA      |
| `inspection.decided`           | função determinística rodou         | `{decision, criticals, majors, minors, limits}` | PCP, Comercial   |
| `inspection.closed`            | transição para aprovada/reprovada   | `{decision, actor}`                             | H9-13, BI        |
| `capa.opened`                  | manual ou por R5                    | `{trigger, defect_code, reference_id, owner}`   | Qualidade, IA    |
| `capa.action.added`            | plano de ação incrementado          | `{action, due_at, owner}`                       | Timeline         |
| `capa.verified`                | R6 atendida                         | `{verified_by, evidence_url, effect_metric}`    | BI, Fornecedor   |
| `capa.reopened`                | reincidência pós-verificação        | `{previous_capa_id, reason}`                    | Alerta gerência  |
| `sku.released`                 | aprovado + `pa_receipt` idempotente | `{sku_id, qty, erp_id}`                         | H9-13, ERP       |
| `sku.rework_requested`         | reprovado com destino retrabalho    | `{sku_id, qty, target_link_type}`               | H9-06 / H9-05    |
| `sku.refuse`                   | refugo                              | `{sku_id, qty, reason_code}`                    | BI custo         |
| `faccao.quality.alert`         | R9 disparada                        | `{supplier_id, evidence_url, defect_code}`      | Portal facção    |

## 8. Integrações (H6)

- **ERP (H6-02):**
  - `getStock(sku.erp_id)` — para saber destino PA e conferir bloqueios.
  - `writeErp('pa_receipt', ...)` — entrada em estoque de PA
    (idempotente via `batch_id:sku_id`).
  - `writeErp('pa_refuse', ...)` — quando decisão é refugo.
- **CAD/PDM (H6-03):** N/A — este elo não consome CAD, apenas usa
  tolerâncias já carregadas na ficha técnica pelo H9-02.
- **E-commerce (H6-04):** indireta — só liberação para PA muda o
  disponível vendável; sincronização é responsabilidade do H9-13.
- **Webhooks/Cron (H6-05):**
  - `POST /api/public/quality-notify` (HMAC, idempotente por
    `x-idempotency-key`) — notifica facções externas com evidência.
  - Cron a cada 30 min: `capa_sla_check` → emite `capa.sla.breached`
    quando `due_at < now()` e não `verificada`.

## 9. UX (V4 / H4)

- **Rota(s):** `/quality` (torre de controle), `/quality/inspection/:id`
  (drawer contextual), `/quality/capa/:id` (drawer CAPA).
- **Componentes contextuais:** `EntityDrawer`, `EntityTimeline`,
  `EntityRelations`, `DefectHeatmap`, `CapaDrawer`, `WorkflowStatusMenu`,
  `CommentsPanel`.
- **Fluxo em cliques (H4-04):** inspetor abre lote → botão "Iniciar AQL"
  (server calcula sample_size) → registra defeitos (3 cliques por
  defeito: código + severidade + foto) → botão "Fechar inspeção" mostra
  decisão calculada; ≤ 7 cliques para o caso feliz sem defeito.
- **Estados:** vazio, carregando, erro, decisão pendente, reprovada,
  CAPA aberta, CAPA vencida — todos cobertos? SIM.

## 10. IA (V11 / H5)

- **Agente(s) responsáveis (V13):**
  - **Especialista Qualidade:** classifica defeito a partir de foto,
    sugere `defect_code` do catálogo, aponta padrões cruzando
    referência × facção × operação.
  - **Especialista CAPA:** propõe causa raiz (5 porquês) usando
    histórico de `quality_capa` + `entity_events` do mesmo grupo de
    referências.
  - **Especialista Facções (H9-05):** consultado quando `source='faccao'`
    para explicar reincidência.
  - **Especialista Lavanderia (H9-06):** consultado quando defeito é
    de encolhimento/tom/aviamento pós-lavagem.

- **Perguntas típicas:**
  - "Por que a REF X reprovou 3 vezes seguidas na facção Y?"
  - "Quais CAPAs abertas há mais de 15 dias sem ação?"
  - "Qual defeito custa mais em refugo neste mês?"

- **Contexto vivo (H5-02):** tabelas `quality_inspection`,
  `quality_defect`, `quality_capa`, `defect_catalog`, `supplier_scorecard`
  - eventos `inspection.*` e `capa.*` das últimas 90 dias (via
    `fetchLiveContext`).

- **Guardrails:**
  - IA **não** aprova/reprova inspeção — só sugere.
  - IA **não** fecha CAPA como `verificada`.
  - IA **não** escreve no ERP.
  - IA **não** notifica facção externa sem revisão humana.

## 11. BI (V10)

| KPI                      | Fórmula                                                | Unidade | Meta   | Responsável        |
| ------------------------ | ------------------------------------------------------ | ------- | ------ | ------------------ |
| First Pass Yield (final) | `inspections.aprovada / inspections.total`             | %       | ≥ 97   | Coord. Qualidade   |
| DPU (defects per unit)   | `Σ defeitos / Σ peças inspecionadas`                   | #       | ≤ 0.05 | Coord. Qualidade   |
| CAPA efficacy rate       | `capas.verificada_sem_reincidência / capas.verificada` | %       | ≥ 85   | Gerente Industrial |
| CAPA median close days   | `mediana(verified_at - opened_at)`                     | dias    | ≤ 15   | Gerente Industrial |
| Refugo (%)               | `qty(sku.refuse) / qty(sku.released + sku.refuse)`     | %       | ≤ 1    | Custo              |
| SLA notificação facção   | `alerts.enviados_em_24h / alerts.total`                | %       | ≥ 95   | Qualidade          |

Fonte: derivado de `entity_events` (`inspection.*`, `capa.*`, `sku.*`) —
nunca contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `quality_inspection`, `quality_defect`, `quality_capa` têm
  policy por ação (SELECT/INSERT/UPDATE/DELETE) restritas a
  `is_member(auth.uid())` e ao papel do usuário. SIM.
- **GRANT:** toda tabela pública deste elo tem `GRANT SELECT, INSERT,
UPDATE, DELETE ... TO authenticated` + `GRANT ALL ... TO service_role`.
  `anon` sem acesso. SIM.
- **Papéis autorizados (`has_role`):** `inspetor_qualidade`,
  `coordenador_qualidade`, `gerente_industrial`, `pcp`,
  `engenharia` (leitura).
- **PII / dado sensível tratado:** fotos de defeito podem conter
  identificação de operador no fardo — bucket privado com signed URL
  curta (5 min); nome do operador nunca vai ao portal externo da facção
  (payload de `faccao.quality.alert` só envia código + evidência).

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
- [ ] Design Review (V13 · 10 perguntas) aprovado
- [ ] QA (V12 · 12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13
- **H2 Domain:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3 Architecture:** H3-01, H3-02, H3-03, H3-04, H3-05
- **H4 Frontend:** H4-01, H4-02, H4-04, H4-05
- **H5 IA:** H5-02, H5-03, H5-05
- **H6 Integrações:** H6-02, H6-05
- **H7 Qualidade:** H7-01, H7-02, H7-04, H7-05
- **H8 Ops:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM             | Como resolve este elo                     | Limitação                        | Como superamos                               |
| --------------- | ----------------------------------------- | -------------------------------- | -------------------------------------------- |
| Centric         | Módulo Quality separado, AQL configurável | CAPA fraca, sem loop de eficácia | CAPA nativa com verificação obrigatória (R6) |
| PTC FlexPLM     | Integração com sistemas externos de QMS   | Não integra defeito em processo  | Defeito único desde H9-05 até H9-07          |
| Lectra Kubix    | Foco em modelagem, qualidade externa      | Terceiriza qualidade final       | Portal facção com HMAC + evidência (R9)      |
| Gerber Yunique  | Checklist manual por lote                 | Sem AQL determinística           | R4 remove decisão discricionária             |
| Collection Moda | Registro em planilha externa              | Sem timeline nem BI              | Tudo em `entity_events`, KPI derivado        |
| Audaces Idea    | Não cobre qualidade                       | —                                | Playbook nativo integrado à cadeia           |

Padrão mental comum extraído: qualidade tratada como **checklist de
saída**, não como ciclo Detectar→Prevenir com dono e prazo.
Nossa aposta de superação: **CAPA de 1ª classe** com eficácia obrigatória

- **decisão AQL determinística no servidor** (sem "aprovação política").

## 16. Riscos e mitigação

| Risco                                      | Impacto | Probabilidade | Mitigação                                                     |
| ------------------------------------------ | ------- | ------------- | ------------------------------------------------------------- |
| Inspetor "salva" defeito para não reprovar | Alto    | Média         | R3 exige catálogo + evidência; R4 tira decisão do inspetor    |
| CAPA fica aberta eternamente               | Médio   | Alta          | Cron `capa_sla_check` + evento `capa.sla.breached`            |
| Reincidência silenciosa                    | Alto    | Média         | R5 dispara CAPA automática por trigger, não depende de humano |
| Evidência com PII vaza para facção         | Alto    | Baixa         | Bucket privado + payload externo só código + URL assinada     |
| Estoque duplicado em PA por replay         | Alto    | Baixa         | R7 idempotência `batch_id:sku_id`                             |

## 17. Changelog do playbook

| Data       | Versão | Autor         | Mudança              |
| ---------- | ------ | ------------- | -------------------- |
| 2026-07-07 | 0.1    | Handbook Team | criação (🟡 parcial) |
