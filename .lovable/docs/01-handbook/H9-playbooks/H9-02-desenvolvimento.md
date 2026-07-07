# H9-02 · Desenvolvimento de Referência

> Playbook do elo **Desenvolvimento** — da referência esboçada (croqui) até
> a peça-piloto aprovada, pronta para engenharia (H9-05) e produção.
> Usa o template canônico `H9-00-template.md`.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM modela/decide/rastreia;
> ERP executa/contabiliza. Toda leitura/escrita de estoque, PO, NF, custo,
> preço e financeiro passa por `ErpAdapter` (H6-02), nunca tabela local.

## 0. Identificação

- **Elo da cadeia (V2):** Coleção → **Croqui → Referência → Modelagem →
  Piloto → Correções → Aprovação** → Engenharia
- **Código do playbook:** H9-02
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **Personas (V1):** Estilista, Coordenador de Desenvolvimento,
  Modelista, Pilotista, Coordenador de Engenharia, Diretor de Estilo
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Coordenador Desenvolvimento
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Transformar uma ideia de peça em uma referência aprovada** — com croqui,
ficha inicial, molde, piloto físico validado — de modo que a Engenharia
(H9-05) consiga industrializar sem retrabalho.

- Resultado esperado: **referência com status `aprovada`**, piloto físico
  aprovado, ficha inicial preenchida, molde-mãe versionado.
- KPI de sucesso (V10): **% de referências aprovadas no 1º piloto** (meta
  ≥ 60%) e **lead time croqui → aprovação** (meta ≤ 21 dias).

## 2. Escopo

- **Faz parte:** croqui, ficha inicial, requisição de piloto, modelagem,
  costura do piloto, prova, ocorrências de piloto, correções, aprovação.
- **Não faz parte:** planejamento macro da coleção (H9-01), engenharia
  detalhada / BOM-BOP (H9-05), compras de insumo (H9-06), mostruário (H9-13).
- **Elo anterior:** H9-01 · Coleção
- **Elo posterior:** H9-05 · Engenharia de Produto

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Coleção aprovada | H9-01 | `collections.status='aprovada'` | SIM |
| 2 | Mix planejado | H9-01 | `collection_targets` (categoria, qtde) | SIM |
| 3 | Cartela de cores/tecidos | H9-01 | lista com fornecedor sugerido | SIM |
| 4 | Grade de tamanhos | Comercial | tabela de medidas por segmento | SIM |
| 5 | Histórico de piloto anterior | ERP via `ErpAdapter` (V9) | `queryErp('pilot_history')` | recomendado |
| 6 | Capacidade de piloto | PCP | vagas na sala-piloto por semana | SIM |

Rastreabilidade: entradas vinculadas via `entity_relations` (H2-06) com
`from_type='collection'` → `to_type='reference'`.

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | Referência criada | H9-05 | `references` + `reference.created` | SIM |
| 2 | Ficha inicial | H9-05 | `reference_specs` (composição, medidas) | SIM |
| 3 | Piloto solicitado | Sala-piloto | `pilots` + `pilot.requested` | SIM |
| 4 | Ocorrências de prova | Modelagem/Estilo | `pilot_occurrences` + `pilot.occurrence.opened` | condicional |
| 5 | Piloto aprovado | H9-05 | `pilots.status='aprovado'` + `pilot.approved` | SIM |
| 6 | Referência aprovada | Todos os elos seguintes | `references.status='aprovada'` + `reference.approved` | SIM |
| 7 | Timeline pública | UI (EntityTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** Só é possível criar `pilot` para uma `reference` com ficha
  inicial preenchida (composição, medidas, tecido principal).
- **R2:** Uma referência só pode ir para `aprovada` se tiver **pelo menos
  um** `pilot.status='aprovado'` associado.
- **R3:** Piloto reprovado abre obrigatoriamente **pelo menos uma**
  `pilot_occurrence` com responsável e prazo.
- **R4:** Cada nova rodada de piloto incrementa `pilots.round` — a rodada
  anterior fica arquivada, nunca sobrescrita.
- **R5:** Aprovação final da referência exige `has_role(auth.uid(),
  'coordenador_desenvolvimento')` **ou** `has_role(auth.uid(),'diretor_estilo')`.
- **R6:** Referência aprovada é **imutável** — mudança vira nova versão
  (`references.version` incrementa e mantém link em `entity_relations`).

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB — trigger `check_reference_ready_for_pilot` | migration H9-02 |
| R2 | DB — trigger `check_reference_ready_for_approval` | migration H9-02 |
| R3 | DB — trigger `require_occurrence_on_reject` | migration H9-02 |
| R4 | DB — trigger `bump_pilot_round` (BEFORE INSERT) | migration H9-02 |
| R5 | DB — policy + `has_role` (H3-03) | migration H9-02 |
| R6 | DB — trigger `prevent_edit_when_approved` | migration H9-02 |

## 6. Workflow (V8 / H2-05)

**Referência (`entity_type='reference'`):**

```text
rascunho → em_desenvolvimento → em_pilotagem → em_revisao → aprovada
                                                     ↓
                                                 reprovada → em_desenvolvimento (nova versão)
                                                     ↓
                                                 arquivada
```

**Piloto (`entity_type='pilot'`):**

```text
solicitado → em_modelagem → em_costura → em_prova → aprovado
                                              ↓
                                          reprovado → em_correcao → em_costura (round++)
```

- Ambas máquinas registradas em `workflow_definitions`.
- `reference_transitions` já existe no projeto — reaproveitar.
- Transição `piloto.aprovado` propaga sinal para a referência dona
  (não altera status automaticamente; abre botão "submeter para revisão").

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `reference.created`            | INSERT `references` | id, collection_id, autor | Timeline, BI |
| `reference.spec.updated`       | UPSERT `reference_specs` | reference_id, campo, valor | Timeline |
| `reference.attachment.added`   | anexo (croqui, foto) | reference_id, url, tipo | Timeline |
| `pilot.requested`              | INSERT `pilots` | reference_id, round, prazo | Sala-piloto, PCP |
| `pilot.modeling.started`       | status → `em_modelagem` | pilot_id, modelista | Timeline |
| `pilot.sewing.started`         | status → `em_costura` | pilot_id, pilotista | Timeline |
| `pilot.trial.scheduled`        | prova marcada | pilot_id, data | Estilo |
| `pilot.occurrence.opened`      | INSERT `pilot_occurrences` | pilot_id, tipo, responsável | Estilo, Modelagem |
| `pilot.occurrence.resolved`    | ocorrência fechada | occurrence_id | Timeline |
| `pilot.approved`               | status → `aprovado` | pilot_id, round, aprovador | Referência |
| `pilot.rejected`               | status → `reprovado` | pilot_id, motivo | Modelagem |
| `reference.submitted_for_review` | status → `em_revisao` | reference_id | Coord. Desenvolvimento |
| `reference.approved`           | status → `aprovada` | reference_id, aprovador | H9-05, BI |
| `reference.rejected`           | status → `reprovada` | reference_id, motivo | Estilo |
| `reference.archived`           | status → `arquivada` | reference_id | Arquivo |

Consumidores usam `use-entity-events` + `EntityTimeline`, `ReferenceTimeline`,
`LoteTimeline` já existentes.

## 8. Integrações (H6)

- **ERP (H6-02):** `ErpAdapter.queryErp('pilot_history')` para trazer
  histórico de rodadas anteriores da mesma modelagem-mãe.
- **CAD/PDM (H6-03):** upload do molde-mãe (arquivo `.plt`/`.dxf`) via
  storage privado; hash do arquivo vira campo em `reference_specs`.
- **E-commerce (H6-04):** N/A — só depois de H9-13.
- **Webhooks/Cron (H6-05):** cron diário publica em `references-live` os
  pilotos com prova marcada para as próximas 48h.

## 9. UX (V4 / H4)

- **Rota principal:** `/references` (`_authenticated.references.tsx`) +
  `/prototypes` (`_authenticated.prototypes.tsx`).
- **Drawer contextual:** `ReferenciaDrawer` com tabs
  *Croqui · Ficha · Pilotos · Ocorrências · Timeline · Relações · IA*.
- **Componentes reutilizados:** `ReferenceTimeline`, `EntityTimeline`,
  `EntityRelations`, `WorkflowStatusMenu`, `PilotosPanel`,
  `NovoPilotoDialog`, `OcorrenciaForm`, `PassagemForm`, `BomBopPanel`
  (leitura), `TechSheetVersions`.
- **Fluxo em cliques (H4-04):** criar referência → anexar croqui →
  preencher ficha inicial → solicitar piloto → registrar prova →
  aprovar. **Máx. 10 cliques** para o caso feliz.
- **Estados:** vazio, carregando (skeleton), erro (retry), sucesso (toast
  + navegação drawer). Todos cobertos.

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Especialista Modelagem* — sugere ajuste de molde com base em
    ocorrências recorrentes da mesma modelagem-mãe.
  - *Especialista Pilotagem* — critica tempo de costura vs. tempo padrão.
  - *Especialista Qualidade* — antecipa defeito provável por tecido.
  - *Coordenador Estilo* — valida se a referência está aderente à cartela
    e ao mix da coleção (H9-01).
- **Perguntas que os agentes devem responder:**
  - "Quais ocorrências se repetem nessa modelagem-mãe?"
  - "Qual tecido tem maior taxa de reprova em piloto?"
  - "Qual estilista tem maior aprovação no 1º piloto?"
- **Contexto vivo (H5-02):** `references`, `reference_specs`, `pilots`,
  `pilot_occurrences`, `entity_events`, `ErpAdapter.queryErp('pilot_history')`.
- **Guardrails:** IA nunca aprova piloto nem referência. IA nunca altera
  molde. Toda sugestão vira comentário auditável com `ai_suggested=true`.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Aprovação no 1º piloto | pilotos aprovados na round 1 ÷ total round 1 | % | ≥ 60% | Modelagem |
| Rodadas médias por referência | Σ `pilots.round` ÷ referências aprovadas | nº | ≤ 1,8 | Desenvolvimento |
| Lead time croqui → aprovação | data `reference.approved` − data `reference.created` | dias | ≤ 21 | Coord. Desenvolvimento |
| Taxa de reprova por tecido | pilotos reprovados por tecido ÷ total por tecido | % | ≤ 20% | Qualidade |
| Ocorrências abertas > 7 dias | count(`pilot_occurrences` open, `now - opened_at > 7d`) | nº | 0 | Coord. Desenvolvimento |

Fonte: derivados de `entity_events` + `references` + `pilots` — sem contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `references`, `reference_specs`, `pilots`, `pilot_occurrences`,
  `reference_transitions` (já existe) — policy por ação, escopo por
  `is_member` + `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar rascunho: `estilista`, `coordenador_desenvolvimento`
  - solicitar piloto: `estilista`, `coordenador_desenvolvimento`
  - executar piloto (modelagem/costura): `modelista`, `pilotista`
  - abrir ocorrência: qualquer papel envolvido
  - aprovar piloto: `coordenador_desenvolvimento`, `diretor_estilo`
  - aprovar referência (R5): idem
  - arquivar: `coordenador_desenvolvimento`, `diretor_estilo`
- **PII/dado sensível:** custo estimado de piloto é sensível — visível
  apenas a coordenação e diretoria (policy separada).

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPI (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow (referência + piloto) em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via adapter (§8)
- [x] UX com drawer + timeline + estados (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPIs derivados de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`references*`, `pilots*`, triggers, workflow)
- [ ] Componentes de rota implementados (drawer + wizard piloto)
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E croqui → aprovação (H7-03)
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
- **H6:** H6-02, H6-03, H6-05
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Sample Management module, comentários por prova | UI densa, sem IA embarcada | Drawer + IA sugerindo ajustes recorrentes |
| PTC FlexPLM | Sample tracking + fit history | Complexidade de setup | Workflow curto (5 estados) + ocorrência simples |
| Lectra Kubix Link | Integração forte com molde CAD | Fraco em comentário/ocorrência de prova | `pilot_occurrences` como cidadão de 1ª classe |
| Gerber Yunique | Fit calendar colaborativo | UI legada, sem tempo real | Timeline evento-a-evento + realtime broadcast |
| Collection Moda (BR) | Ficha piloto + rodadas | Sem versionamento imutável | R6 imutabilidade + versionamento |
| Audaces Idea | CAD/moulage forte | Não cobre workflow de aprovação | Este playbook cobre o gap |

Padrão mental comum: **referência = ficha + croqui + rodadas de piloto
com ocorrências rastreadas**, aprovada por coordenação antes de engenharia.
Nossa superação: **timeline em tempo real + IA multi-especialista + imutabilidade + aderência ERP nacional**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Piloto aprovado com ocorrência aberta | Defeito em produção | média | R3 obriga ocorrência ao reprovar + KPI §11 |
| Molde-mãe sobrescrito sem versão | Perda de histórico | baixa | R4 `round++` + R6 imutabilidade |
| Múltiplas rodadas escondem incompetência de tecido | Custo alto | média | KPI "Taxa de reprova por tecido" (§11) + agente Qualidade |
| Aprovação sem coordenador | Referência inconsistente | baixa | R5 policy `has_role` |
| IA sugerir ajuste de molde por conta própria | Retrabalho | média | Guardrail §10 — sugestão auditável, nunca autônoma |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
