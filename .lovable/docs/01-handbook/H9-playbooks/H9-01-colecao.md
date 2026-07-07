# H9-01 · Coleção

> Playbook do elo **Coleção** — do briefing estratégico à carta-coleção
> aprovada, pronta para virar Referência (H9-02) e depois Piloto.
> Usa o template canônico `H9-00-template.md`.

---

> **Fronteira PLM × ERP** — este playbook herda o bloco canônico do
> `H9-00-template.md` (§ Fronteira PLM × ERP). PLM modela/decide/rastreia;
> ERP executa/contabiliza. Toda leitura/escrita de estoque, PO, NF, custo,
> preço e financeiro passa por `ErpAdapter` (H6-02), nunca tabela local.

## 0. Identificação

- **Elo da cadeia (V2):** Pesquisa → Moodboard → Cartela → Tendências → Briefing → **Coleção**
- **Código do playbook:** H9-01
- **Volumes FPEF:** V1, V2, V4, V5, V6, V7, V8, V10, V11, V13, V14
- **Personas (V1):** Diretor de Estilo, Coordenador de Estilo, Estilista,
  Coordenador de Desenvolvimento, Diretor Comercial, Diretor Industrial
- **Estado:** 🟡 rascunho revisável
- **Autor / Revisor:** Software House IA (V13) · Diretor Produto
- **Última revisão:** 2026-07-07

## 1. Objetivo do elo

**Transformar pesquisa e tendência em uma coleção viável** — com identidade,
mix, calendário e meta comercial claros — antes de qualquer investimento em
piloto, ficha técnica ou compra.

- Resultado esperado: **carta-coleção aprovada** (nome, tema, calendário,
  mix por categoria, meta de faturamento, orçamento de desenvolvimento).
- KPI de sucesso (V10): **% de referências da coleção que chegam à venda
  dentro do calendário planejado** (meta ≥ 80%).

## 2. Escopo

- **Faz parte:** briefing, moodboard consolidado, cartela de cores/tecidos,
  mix planejado, calendário macro, meta comercial, orçamento de desenvolvimento,
  aprovação formal.
- **Não faz parte:** desenho de referência (H9-02), modelagem/piloto (H9-04),
  engenharia (H9-05), compras (H9-06).
- **Elo anterior:** Pesquisa & Tendências (H9-00 pré-coleção)
- **Elo posterior:** H9-02 · Referência & Desenvolvimento

## 3. Entradas

| # | Entrada | Origem | Formato | Obrigatória? |
|---|---------|--------|---------|--------------|
| 1 | Moodboard da estação | Pesquisa (V2) | `MoodBoard` (`src/components/research/MoodBoard.tsx`) | SIM |
| 2 | Tendências macro | Pesquisa | anotações + imagens | SIM |
| 3 | Cartela de cores/tecidos | Pesquisa/Compras | lista com fornecedor sugerido | SIM |
| 4 | Histórico de venda da estação anterior | ERP (via `ErpAdapter`, V9) | contrato `queryErp` | SIM |
| 5 | Meta comercial da estação | Diretoria Comercial | número + mix por canal | SIM |
| 6 | Orçamento de desenvolvimento | Diretoria Industrial | valor teto por coleção | SIM |
| 7 | Calendário macro | PCP | datas-âncora (kickoff, mostruário, entrega) | SIM |

Rastreabilidade: toda entrada vira registro em `collection_inputs` ligado a
`collections.id` via `entity_relations` (H2-06).

## 4. Saídas

| # | Saída | Destino | Entidade / Evento | Obrigatória? |
|---|-------|---------|-------------------|--------------|
| 1 | Coleção criada | H9-02 | `collections` + evento `collection.created` | SIM |
| 2 | Carta-coleção aprovada | Todos os elos seguintes | `collections.status='aprovada'` + evento `collection.approved` | SIM |
| 3 | Mix planejado por categoria | H9-02, H9-06 | `collection_targets` (categoria, qtde, ticket) | SIM |
| 4 | Calendário macro | H9-08 (PCP) | `collection_calendar` (marco, data, responsável) | SIM |
| 5 | Meta comercial e orçamento | H9-13, BI (V10) | campos em `collections` | SIM |
| 6 | Timeline pública | UI (EntityTimeline) | leitura de `entity_events` | SIM |

## 5. Regras de negócio (V6)

- **R1:** Uma coleção só sai do status `rascunho` se tiver moodboard, cartela,
  mix, calendário, meta comercial e orçamento preenchidos.
- **R2:** Aprovação final exige `has_role(auth.uid(),'diretor_produto')`
  **e** `has_role(auth.uid(),'diretor_comercial')` (dupla assinatura).
- **R3:** Uma coleção `aprovada` **não** pode ser editada — só clonada. Mudança
  vira nova versão (`collections.version` incrementa).
- **R4:** Meta comercial vazia ou orçamento vazio bloqueia aprovação — regra
  no trigger, não só no client.
- **R5:** Não é permitido mais de uma coleção `em_desenvolvimento` por
  estação/marca — evita canibalização.

| Regra | Camada | Referência |
|-------|--------|------------|
| R1    | DB — trigger `check_collection_ready_for_review` | migration H9-01 |
| R2    | DB — policy + `has_role` (V6, H3-03) | migration H9-01 |
| R3    | DB — trigger `prevent_edit_when_approved` | migration H9-01 |
| R4    | DB — trigger em §R1 | migration H9-01 |
| R5    | DB — unique index parcial `WHERE status='em_desenvolvimento'` | migration H9-01 |

## 6. Workflow (V8 / H2-05)

```text
rascunho → em_desenvolvimento → em_revisao → aprovada
                                      ↓
                                  reprovada → rascunho (nova versão)
                                      ↓
                                  arquivada
```

- Registrado em `workflow_definitions` com `entity_type='collection'`.
- Transição `em_revisao → aprovada`: exige dupla assinatura (R2).
- Transição `aprovada → arquivada`: só após término da estação.
- Toda transição chama `public.log_reference_status_change`-equivalente e
  emite evento (§7).

## 7. Eventos emitidos (V7 / H2-04)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
| `collection.created`      | INSERT `collections` | id, nome, estação, autor | Timeline, BI |
| `collection.input.added`  | vínculo em `collection_inputs` | collection_id, input_type, ref_id | Timeline |
| `collection.target.set`   | UPSERT `collection_targets` | categoria, qtde, ticket | BI, H9-06 |
| `collection.calendar.set` | UPSERT `collection_calendar` | marco, data | PCP (H9-08) |
| `collection.submitted_for_review` | status → `em_revisao` | id, autor | Diretoria |
| `collection.approved`     | status → `aprovada` | id, aprovadores[] | Todos os elos seguintes |
| `collection.rejected`     | status → `reprovada` | id, motivo | Estilo |
| `collection.archived`     | status → `arquivada` | id | BI, arquivamento |

Consumidores usam `use-entity-events` + `EntityTimeline` (H4-04).

## 8. Integrações (H6)

- **ERP (H6-02):** leitura de `sales_history` (estação anterior) via
  contrato `ErpAdapter.queryErp('sales_by_category')` — nunca acesso direto.
- **CAD/PDM (H6-03):** N/A neste elo.
- **E-commerce (H6-04):** N/A — a coleção só chega ao e-commerce após
  H9-13 (Comercial).
- **Webhooks/Cron (H6-05):** cron diário publica em `pcp-live` a próxima
  data-âncora do calendário (§7 `collection.calendar.set`).

## 9. UX (V4 / H4)

- **Rota principal:** `/collections` (`_authenticated.collections.tsx`).
- **Drawer contextual:** `EntityDrawer` com tabs
  *Visão · Mix · Calendário · Timeline · Relações · IA*.
- **Componentes reutilizados:**
  `EntityTimeline`, `EntityRelations`, `WorkflowStatusMenu`,
  `MoodBoard`, `CollectionPerformance`, `CollectionROI`.
- **Fluxo em cliques (H4-04):** criar → preencher wizard 4 passos
  (identidade → cartela → mix → calendário) → submeter → aprovar. **Máx. 8 cliques.**
- **Estados:** vazio (primeira coleção), carregando (skeleton),
  erro (retry), sucesso (toast + navegação para drawer). Todos cobertos.

## 10. IA (V11 / H5)

- **Agentes (V13):**
  - *Coordenador Estilo* — sugere mix a partir do histórico + tendência.
  - *Especialista Tendências* — valida cartela contra sinais externos.
  - *Especialista PCP* — critica o calendário contra capacidade real.
  - *Especialista Custo/Margem* — critica meta comercial vs. orçamento.
- **Perguntas que os agentes devem responder:**
  - "Qual mix maximiza margem dentro do orçamento?"
  - "Qual data-âncora está incompatível com capacidade?"
  - "Quais cores/tecidos têm fornecedor confiável e prazo compatível?"
- **Contexto vivo (H5-02):** `collections`, `collection_inputs`,
  `collection_targets`, `collection_calendar`, `entity_events`,
  `ErpAdapter.queryErp('sales_by_category')`.
- **Guardrails:** IA nunca aprova coleção. IA nunca altera meta comercial.
  Toda sugestão vira comentário auditável com `ai_suggested=true`.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| Aderência ao calendário | referências entregues no prazo ÷ total | % | ≥ 80% | PCP |
| Cobertura da meta comercial | faturamento realizado ÷ meta | % | ≥ 95% | Comercial |
| Aderência ao orçamento de desenvolvimento | custo real ÷ orçamento | % | ≤ 100% | Industrial |
| Taxa de aproveitamento | referências vendidas ÷ referências desenvolvidas | % | ≥ 70% | Produto |
| Lead time da coleção | data aprovação − data kickoff | dias | ≤ 45 | Coordenador Desenvolvimento |

Fonte: derivados de `entity_events` + `collections` + ERP — nenhuma contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `collections`, `collection_inputs`, `collection_targets`,
  `collection_calendar` — policy por ação, escopo por `is_member` +
  `has_role`.
- **GRANT:** `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para
  `service_role`; **sem** grant para `anon`.
- **Papéis autorizados (`has_role`):**
  - criar/editar rascunho: `estilista`, `coordenador_estilo`, `coordenador_desenvolvimento`
  - submeter para revisão: `coordenador_estilo`
  - aprovar (R2): `diretor_produto` **e** `diretor_comercial`
  - arquivar: `diretor_produto`
- **PII/dado sensível:** meta comercial e orçamento são sensíveis —
  visíveis apenas a diretoria (policy separada).

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPI (§1)
- [x] Entradas/saídas rastreáveis (§3, §4)
- [x] Regras codificadas em DB/server (§5)
- [x] Workflow em `workflow_definitions` (§6)
- [x] Eventos declarados (§7)
- [x] Integrações via adapter (§8)
- [x] UX com drawer + timeline + estados (§9)
- [x] Agentes IA com escopo e guardrails (§10)
- [x] KPI catalogado e derivado de eventos (§11)
- [x] RLS + GRANT desenhados (§12)
- [ ] Migração SQL aplicada (`collections*` + workflow + triggers)
- [ ] Componentes de rota implementados (`/collections` wizard)
- [ ] Testes RLS + workflow (H7-02)
- [ ] Teste E2E do fluxo criar → aprovar (H7-03)
- [ ] Design Review V13 (10 perguntas) assinado
- [ ] QA V12 (12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **H1:** H1-01 (protocolo), H1-04 (dor→entidade), H1-05 (spec template)
- **H2:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3:** H3-01, H3-02, H3-03, H3-04, H3-05
- **H4:** H4-01, H4-02, H4-04, H4-05
- **H5:** H5-02, H5-03, H5-05
- **H6:** H6-02, H6-05
- **H7:** H7-01, H7-02, H7-03, H7-05
- **H8:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM | Como resolve | Limitação | Como superamos |
|-----|--------------|-----------|----------------|
| Centric | Line planning module robusto, integrado a buying calendar | UI densa, licenciamento caro | Wizard de 4 passos + IA sugerindo mix |
| PTC FlexPLM | Season Plan + Assortment Planning enterprise | Curva de aprendizado, dependência TI | Fluxo drawer contextual, sem tela cheia |
| Lectra Kubix Link | Collection plan atrelado a material library | Foca material, fraco em meta comercial | Meta + orçamento como campos de 1ª classe |
| Gerber Yunique | Calendar + line sheet colaborativos | UI legada | Timeline evento-a-evento em tempo real |
| Collection Moda (BR) | Ficha de coleção prática, aderência à confecção | Sem IA, sem BI derivado de eventos | IA especialista + KPIs por evento |
| Audaces Idea | Ecossistema CAD forte | Não cobre planejamento de coleção | Este playbook cobre o gap |

Padrão mental comum: **coleção = artefato planejado com mix + calendário +
meta**, aprovado por diretoria antes de qualquer desenvolvimento.
Nossa superação: **wizard de 4 passos + IA multi-especialista + timeline
auditável + aderência a ERP nacional**.

## 16. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Aprovação sem meta clara | Coleção sem foco comercial | média | R2 dupla assinatura + R4 trigger |
| Calendário irreal | Atraso em cascata | alta | Agente PCP critica antes da aprovação |
| Coleção clonada perde histórico | Perda de contexto | baixa | Versionamento em `collections.version` + `entity_relations` mantém link |
| Orçamento estourado silenciosamente | Prejuízo | média | KPI §11 acompanhado em BI + alerta |
| IA sugerir mix fora do orçamento | Ruído | média | Guardrail §10 — sugestão auditável, nunca autônoma |

## 17. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-07-07 | 0.1 | Software House IA | criação inicial do playbook |
