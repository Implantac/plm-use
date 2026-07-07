# H9-03 · Modelagem

> Playbook do elo **Modelagem** — da referência aprovada em croqui/ficha
> até o **molde-mãe versionado + grade de tamanhos + encaixe validado**,
> pronto para pilotagem (H9-02) e engenharia (H9-05).
> Usa o template canônico `H9-00-template.md`.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM modela/decide/rastreia;
> ERP executa/contabiliza. Toda leitura/escrita de estoque, PO, NF, custo,
> preço e financeiro passa por `ErpAdapter` (H6-02), nunca tabela local.

## 0. Identificação

- **Elo da cadeia (V2):** Referência → **Modelagem (molde-mãe → graduação →
  encaixe → validação)** → Piloto → Engenharia
- **Código do playbook:** H9-03
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **Personas (V1):** Modelista, Especialista Modelagem, Encaixista,
  Coordenador de Desenvolvimento, Coordenador de Engenharia,
  Especialista Corte
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Especialista Modelagem
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Traduzir a referência em molde industrial confiável** — molde-mãe correto,
grade completa, encaixe com rendimento medido — para que a peça vista bem
em todas as tamanhos e consuma tecido dentro do orçado.

- Resultado esperado: `pattern` com `status='validado'`, grade cadastrada,
  encaixe com rendimento aceito, arquivo CAD versionado e assinado.
- KPIs de sucesso (V10):
  - **Rendimento de encaixe** vs. meta por categoria (≥ 85%).
  - **% de moldes validados sem retrabalho de graduação** (≥ 70%).
  - **Lead time referência aprovada → molde validado** (≤ 5 dias úteis).

## 2. Escopo

- **Faz parte:** molde-mãe (base), graduação (grade de tamanhos), encaixe
  (marker), medição, validação técnica, versionamento CAD, assinatura.
- **Não faz parte:** croqui/ficha inicial (H9-02), costura do piloto
  (H9-02), corte real em produção (H9-09), engenharia BOM/BOP (H9-05).
- **Elo anterior:** H9-02 · Desenvolvimento (referência com ficha inicial)
- **Elo posterior:** H9-02 · Pilotagem (round 1) e depois H9-05 · Engenharia

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Referência com ficha inicial | H9-02 | `references.status='em_desenvolvimento'` + `reference_specs` | SIM |
| 2 | Grade de tamanhos alvo | Comercial | tabela de medidas por segmento | SIM |
| 3 | Tecido principal (largura útil, encolhimento) | Compras / ERP | `queryErp('fabric_specs')` | SIM |
| 4 | Molde-mãe pré-existente (reuso) | PDM/CAD | arquivo `.plt`/`.dxf` + hash | opcional |
| 5 | Histórico de rendimento por categoria | ERP via `ErpAdapter` (V9) | `queryErp('marker_yield_history')` | recomendado |
| 6 | Capacidade da sala de modelagem | PCP | vagas por semana | SIM |

Rastreabilidade: `entity_relations` (H2-06) — `reference` → `pattern` →
`pattern_grade` → `marker`.

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | Molde-mãe criado | H9-02, PDM | `patterns` + `pattern.created` | SIM |
| 2 | Grade (tamanhos graduados) | Piloto/Produção | `pattern_grades` + `pattern.grade.set` | SIM |
| 3 | Encaixe (marker) medido | H9-05, H9-09 | `markers` + `marker.measured` | SIM |
| 4 | Rendimento aceito | Engenharia (H9-05) | `markers.yield_pct` + `marker.accepted` | SIM |
| 5 | Molde validado | H9-02 piloto + H9-05 | `patterns.status='validado'` + `pattern.validated` | SIM |
| 6 | Arquivo CAD versionado | PDM | storage privado + hash em `patterns.cad_hash` | SIM |
| 7 | Timeline pública | UI (EntityTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** Não é possível criar `pattern_grade` sem `patterns.status IN
  ('em_construcao','em_revisao')` e sem base `pattern_id` definida.
- **R2:** Não é possível criar `marker` sem `pattern_grade` completa (todos
  os tamanhos-alvo presentes).
- **R3:** `marker.status='aceito'` exige `yield_pct >= min_yield_by_category`
  (tabela `category_yield_targets`); abaixo do mínimo → obriga
  justificativa em `marker.justification`.
- **R4:** `patterns.status='validado'` exige **pelo menos um** `marker`
  com `status='aceito'` **e** assinatura do especialista modelagem
  (`has_role(auth.uid(),'especialista_modelagem')`).
- **R5:** Toda mudança em `pattern` já validado gera nova versão
  (`patterns.version` incrementa, arquivo CAD re-anexado, hash novo);
  o registro anterior fica imutável.
- **R6:** Upload de arquivo CAD sem hash SHA-256 é rejeitado no server
  (trigger + validação `zod` na server function).

| Regra | Camada | Referência |
|-------|--------|------------|
| R1 | DB — trigger `check_pattern_state_for_grade` | migration H9-03 |
| R2 | DB — trigger `check_grade_complete_for_marker` | migration H9-03 |
| R3 | DB — trigger `enforce_yield_threshold` | migration H9-03 |
| R4 | DB — policy + `has_role` + trigger `require_accepted_marker` | migration H9-03 |
| R5 | DB — trigger `bump_pattern_version` (BEFORE UPDATE) | migration H9-03 |
| R6 | Server fn — `zod` schema + trigger `reject_cad_without_hash` | `src/lib/patterns/*.functions.ts` |

## 6. Workflow (V8 / H2-05)

**Molde (`entity_type='pattern'`):**

```text
em_construcao → em_graduacao → em_encaixe → em_revisao → validado
                                                  ↓
                                              reprovado → em_construcao (nova versão)
                                                  ↓
                                              arquivado
```

**Encaixe (`entity_type='marker'`):**

```text
esboço → medido → em_revisao → aceito
                        ↓
                    rejeitado → esboço (novo tentativa)
```

- Ambas máquinas em `workflow_definitions`.
- Transição `pattern.validado` **só** habilitada após ≥ 1 `marker.aceito`
  (R4). Botão de submissão fica desabilitado no client, regra aplicada
  no server.

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `pattern.created`         | INSERT `patterns` | id, reference_id, base_pattern_id | Timeline, BI |
| `pattern.grade.set`       | UPSERT `pattern_grades` | pattern_id, sizes[] | H9-02, H9-05 |
| `pattern.cad.uploaded`    | novo arquivo CAD | pattern_id, hash, size | PDM, Timeline |
| `marker.created`          | INSERT `markers` | pattern_id, tecido, largura | Timeline |
| `marker.measured`         | rendimento calculado | marker_id, yield_pct, consumo_m | BI |
| `marker.accepted`         | status → `aceito` | marker_id, aprovador, justification? | H9-05, H9-09 |
| `marker.rejected`         | status → `rejeitado` | marker_id, motivo | Modelagem |
| `pattern.submitted_for_review` | status → `em_revisao` | pattern_id | Especialista Modelagem |
| `pattern.validated`       | status → `validado` | pattern_id, assinante, version | H9-02, H9-05, BI |
| `pattern.rejected`        | status → `reprovado` | pattern_id, motivo | Modelagem |
| `pattern.archived`        | status → `arquivado` | pattern_id | Arquivo |
| `pattern.reuse.linked`    | reuso de molde-mãe | new_pattern_id, base_pattern_id | BI |

Consumidores: `EntityTimeline`, `ReferenceTimeline`, `use-entity-events`,
`ReferenciaDrawer` (nova tab *Modelagem*).

## 8. Integrações (H6)

- **ERP (H6-02):** `ErpAdapter.queryErp('fabric_specs')` (largura útil,
  encolhimento) e `queryErp('marker_yield_history')` (histórico por
  categoria). Nunca query direta.
- **CAD/PDM (H6-03):** upload de arquivo `.plt`/`.dxf` em storage privado
  (bucket `patterns`). Hash SHA-256 obrigatório no metadata (R6).
  Nenhuma renderização client-side de arquivo grande (H4-05).
- **E-commerce (H6-04):** N/A.
- **Webhooks/Cron (H6-05):** cron diário publica em `references-live`
  moldes com `em_revisao > 48h` (SLA de revisão).

## 9. UX (V4 / H4)

- **Rota principal:** `/references` (aba *Modelagem* no `ReferenciaDrawer`)
  + tela dedicada `/prototypes` já existente.
- **Drawer contextual:** nova aba *Modelagem* com sub-abas
  *Molde · Grade · Encaixe · CAD · Timeline · IA*.
- **Componentes a reutilizar:** `EntityTimeline`, `EntityRelations`,
  `WorkflowStatusMenu`, `ReferenciaDrawer`, `TechSheetVersions`,
  `BomBopPanel` (leitura), `ErpBadge`.
- **Componentes novos (mínimos):** `PatternGradeTable`, `MarkerYieldCard`,
  `CadUploadDropzone`.
- **Fluxo em cliques (H4-04):** abrir referência → aba Modelagem →
  criar molde → subir CAD → definir grade → criar encaixe → medir →
  aceitar → validar. **Máx. 10 cliques** no caso feliz.
- **Estados:** vazio, carregando (skeleton), erro (retry), sucesso
  (toast). Todos cobertos.

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Especialista Modelagem* — sugere reuso de molde-mãe com base em
    similaridade de ficha (`reference_specs`) + histórico.
  - *Especialista Corte* — critica rendimento esperado vs. meta da
    categoria e sugere reorganização de encaixe.
  - *Especialista Custo/Margem* — traduz rendimento em impacto de custo
    de tecido (link com H9-05).
  - *Especialista Pilotagem* — antecipa risco de reprova do piloto por
    padrões da grade (ex.: cava/manga incoerente).
- **Perguntas que os agentes devem responder:**
  - "Existe molde-mãe reusável para essa referência?"
  - "Qual encaixe tem melhor rendimento em tecido de 1,50m?"
  - "Quais moldes desta modelista tiveram maior reprova em piloto?"
- **Contexto vivo (H5-02):** `patterns`, `pattern_grades`, `markers`,
  `references`, `reference_specs`, `entity_events`,
  `ErpAdapter.queryErp('marker_yield_history')`.
- **Guardrails:** IA nunca altera molde nem aceita encaixe. Toda sugestão
  vira comentário com `ai_suggested=true` e link para o evento-fonte.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Rendimento médio de encaixe | Σ `marker.yield_pct` aceitos ÷ n | % | ≥ 85% | Modelagem |
| Reuso de molde-mãe | `pattern.reuse.linked` ÷ `pattern.created` | % | ≥ 40% | Modelagem |
| Lead time referência → molde validado | `pattern.validated` − `reference.approved` | dias úteis | ≤ 5 | Coord. Desenvolvimento |
| Retrabalho de graduação | patterns com > 1 `pattern.rejected` ÷ total | % | ≤ 15% | Modelagem |
| Encaixes abaixo do mínimo aceitos | `marker.accepted` com `justification IS NOT NULL` ÷ aceitos | % | ≤ 10% | Coord. Engenharia |

Fonte: derivados de `entity_events` + `patterns` + `markers`. Sem contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `patterns`, `pattern_grades`, `markers`, `category_yield_targets` —
  policy por ação, escopo por `is_member` + `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar molde/grade: `modelista`, `especialista_modelagem`
  - criar/medir encaixe: `encaixista`, `especialista_modelagem`
  - aceitar encaixe (R3): `especialista_modelagem`, `coordenador_engenharia`
  - validar molde (R4): `especialista_modelagem`
  - editar `category_yield_targets`: `coordenador_engenharia`, `diretor_industrial`
  - arquivar: `especialista_modelagem`, `coordenador_desenvolvimento`
- **PII/dado sensível:** N/A (não há PII neste elo). Arquivo CAD é
  propriedade intelectual — bucket privado, URL assinada com TTL curto
  via `signed-url-cache`.

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPIs (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow (molde + encaixe) em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via adapter + CAD via storage privado (§8)
- [x] UX com aba Modelagem + estados cobertos (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPIs derivados de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`patterns`, `pattern_grades`, `markers`,
      `category_yield_targets`, triggers, workflow)
- [ ] Bucket storage `patterns` com policy privada
- [ ] Componentes novos (`PatternGradeTable`, `MarkerYieldCard`,
      `CadUploadDropzone`) implementados
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E criar molde → validar (H7-03)
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
- **H6:** H6-02, H6-03 (CAD/PDM), H6-05
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Pattern & marker module integrado a sample | Depende de CAD proprietário caro | Storage privado + hash + agnóstico de CAD |
| PTC FlexPLM | Bill of Labor + integração Gerber | Fora do alcance de PMEs brasileiras | Fluxo simples, aderente a `.plt`/`.dxf` livres |
| Lectra Kubix Link | Modaris + Diamino nativos, benchmark de rendimento | Ecossistema fechado Lectra | Rendimento medido dentro do PLM + agente Corte |
| Gerber Yunique | Pattern versioning + AccuMark link | UI legada, sem IA | Timeline + agente sugere reuso de molde-mãe |
| Collection Moda (BR) | Cadastro de molde/grade prático | Sem controle de rendimento nem reuso | KPI de rendimento e reuso como 1ª classe |
| Audaces Idea | Ecossistema CAD forte (Idea/Molde/Encaixe) | Não é PLM — não amarra evento/workflow | Este playbook amarra CAD à cadeia digital |

Padrão mental comum: **molde = base + grade + encaixe medido, versionado**.
Nossa superação: **hash CAD obrigatório + rendimento como KPI vivo +
reuso de molde-mãe sugerido por IA + workflow imutável após validado**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Molde validado com grade incompleta | Piloto ruim em tamanhos extremos | média | R2 + R4 (server) |
| Encaixe aceito abaixo da meta sem justificativa | Custo de tecido estourado | alta | R3 + KPI §11 monitorado |
| Arquivo CAD substituído sem versão | Perda de histórico industrial | baixa | R5 versionamento + hash |
| Reuso de molde-mãe indevido | Peça não veste | baixa | Agente sugere, humano decide (guardrail §10) |
| Vazamento de propriedade intelectual (CAD) | Legal/competitivo | baixa | Bucket privado + URL assinada TTL curto |
| IA aceitar encaixe automaticamente | Custo/risco não auditado | média | Guardrail §10 — IA nunca aceita, só sugere |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
