# H9-09 · Mostruário

Elo entre **Qualidade & CAPA** (H9-07) e **Lançamento** (H9-10, futuro).
Cobre a construção do mostruário físico e digital que representa a
coleção diante de representantes, buyers, showroom, sell-in e imprensa
— sem se confundir com estoque comercial (que é do ERP).

---

> **Fronteira PLM × ERP** — herda o bloco canônico de `H9-00-template.md`.
> PLM **cura, aprova e rastreia** o mostruário (peças-mãe, kits, roteiro
> de showroom, feedback, aprovações). O **ERP mantém** o SKU cadastral,
> saldo (inclusive das peças destinadas a mostruário via
> `stock_type='SAMPLE'`), transferências entre CDs e qualquer movimentação
> fiscal. PLM nunca duplica SKU, nunca soma saldo de mostruário, nunca
> emite NF de remessa de amostra — solicita ao ERP via `ErpAdapter`
> (H6-02) com `writeErp('sample_transfer', {...})` idempotente.

---

## 0. Identificação

- **Elo da cadeia (V2):** Mostruário
- **Código do playbook:** H9-09
- **Volume(s) FPEF relacionados:** V2, V4, V5, V6, V7, V8, V9, V10, V11, V14
- **Personas envolvidas (V1):** Coordenação de Produto, Estilista,
  Merchandising, Comercial (sell-in), Showroom, Representante,
  Marketing (para imagens), PCP (para peças-mãe), Qualidade (aprovação
  final)
- **Estado:** 🟡 parcial
- **Autor / Revisor:** Handbook Team / Produto
- **Última revisão:** 2026-07-08

## 1. Objetivo do elo

Transformar cada **referência aprovada** em uma **peça de mostruário**
apresentável (física + digital) que sustente a decisão comercial do
sell-in, com curadoria por linha, storytelling de coleção e feedback
estruturado que retorna para o PLM (não para planilha solta).

- **Resultado esperado ao fim do elo:** mostruário 100% coberto por
  peça aprovada, kits montados por rota de representante, ficha
  digital de mostruário publicada, evento `showroom.published`
  registrado, feedback capturado em `showroom_feedback`.
- **Métrica de sucesso (KPI, V10):**
  `showroom_coverage ≥ 98%` (referências planejadas com peça-mãe
  aprovada), `showroom_lead_time ≤ 15d` (aprovação → showroom pronto),
  `feedback_capture_rate ≥ 80%` (peças com pelo menos 1 feedback
  estruturado antes do lançamento).

## 2. Escopo

- **Faz parte:** definição do plano de mostruário (quais referências,
  quais grades, quais cores), solicitação e recebimento das peças-mãe,
  aprovação estética/qualidade final da peça-mãe, montagem de kits por
  rota/representante, ficha digital de mostruário (fotos, medidas,
  storytelling, preço-alvo em leitura via ERP), roteiro de showroom,
  captura de feedback (representante, buyer, showroom), decisão
  Go/No-Go por referência para o **Lançamento** (H9-10).
- **Não faz parte:** produção em massa (H9-05), venda transacional
  (ERP), emissão de NF de remessa de amostra (ERP), cadastro fiscal
  do SKU (ERP), custo real e margem final (ERP + BI derivado).
- **Elo anterior:** H9-07 · Qualidade & CAPA (SKU aprovado)
- **Elo posterior:** H9-10 · Lançamento (a criar)

## 3. Entradas (inputs)

| # | Entrada | Origem (elo/sistema) | Formato | Obrigatória? |
|---|---------|----------------------|---------|--------------|
| 1 | Referência aprovada (`references.status='APROVACAO'` ou `ENGENHARIA`) | H9-02 / H9-07 | `references` | Sim |
| 2 | Piloto final aprovado da peça-mãe | H9-02 | `pilotos` (status=`aprovado`) | Sim |
| 3 | Grade e cor de mostruário planejadas | Coleção (H9-01) | `showroom_plan_item` | Sim |
| 4 | SKU cadastral (`erp_id`) para leitura preço/EAN | ERP via `ErpAdapter.getProduct` | contrato H6-02 | Sim |
| 5 | Peça-mãe física recebida | Produção interna ou facção (H9-05) | evento físico + `showroom_sample.received` | Sim |
| 6 | Rotas de representante / calendário de showroom | Comercial | `showroom_route` | Sim |
| 7 | Fotos de produto (still + ambientada) | Marketing / Estúdio | `asset_attachments` | Sim |
| 8 | CAPA aberta bloqueando a referência (se houver) | H9-07 | `quality_capa.status` | Sim |

Regras:
- Toda entrada rastreável a entidade do catálogo (H2-02).
- **Nunca** ler preço/EAN/saldo do ERP direto — só via `ErpAdapter`
  (H6-02), cache ≤ 60s.
- Referência com CAPA `open` **não entra** em mostruário publicado.

## 4. Saídas (outputs)

| # | Saída | Destino (elo/sistema) | Entidade / Evento | Obrigatória? |
|---|-------|-----------------------|-------------------|--------------|
| 1 | Peça-mãe aprovada para mostruário | PLM | `showroom_sample` + `sample.approved` | Sim |
| 2 | Kit de mostruário montado por rota | PLM | `showroom_kit` + `kit.assembled` | Sim |
| 3 | Solicitação de remessa de amostra ao ERP | ERP | `writeErp('sample_transfer')` + `sample.transfer.requested` | Sim |
| 4 | Ficha digital de mostruário publicada | PLM (público interno) | `showroom_publication` + `showroom.published` | Sim |
| 5 | Feedback estruturado por representante/buyer | PLM | `showroom_feedback` + `feedback.captured` | Sim |
| 6 | Decisão Go / No-Go / Revisar por referência | PLM → H9-10 | `showroom_decision` + `reference.launch_decision` | Sim |
| 7 | Atualização de status da referência (`APROVACAO → ENGENHARIA` ou `ARQUIVADA`) | PLM | trigger `log_reference_status_change` | Sim |
| 8 | Encaminhamento de defeito recorrente ao Qualidade | H9-07 | `quality_capa` (auto-open) | Condicional |

Regras:
- Toda saída relevante emite `entity_events` (V7 / H2-04).
- Mudanças de estado passam por `workflow_definitions` (V8 / H2-05).
- Toda escrita no ERP é idempotente (`idempotency_key` determinístico
  = `sample:{reference_id}:{route_id}`).

## 5. Regras de negócio (V6)

- **R1 — SKU cadastral é do ERP.** PLM referencia `erp_id`; nunca cria
  tabela espelho de produto.
- **R2 — Sem estoque local de mostruário.** Peça-mãe fisicamente
  existe, mas o saldo é do ERP (tipo `SAMPLE`). PLM só rastreia
  **posse lógica** (com quem está: showroom, representante X, retorno).
- **R3 — Sem preço no PLM.** Preço-alvo/tabela vem via `ErpAdapter`
  em tempo de leitura, com badge `ErpBadge` na ficha digital.
- **R4 — CAPA `open` bloqueia publicação.** `showroom_publication`
  não aceita referência com CAPA em aberto para o mesmo SKU/família.
- **R5 — Feedback é entidade, não campo livre.** Sempre estruturado:
  `dimensao ∈ {caimento, cor, tato, medida, preco_percebido, storytelling}` +
  nota 1–5 + comentário + autor + rota.
- **R6 — Go / No-Go registra decisão, não status.** Decisão vira
  evento + gatilho: `Go` libera H9-10; `No-Go` arquiva ou volta para
  H9-02; `Revisar` abre nova rodada de piloto com `pilotos.tipo='revisao'`.
- **R7 — Sem duplicação de imagem.** `asset_attachments` já usado por
  Referência é reaproveitado; mostruário só **cura** e ordena.
- **R8 — Remessa de amostra é ERP.** Toda saída física passa por
  `writeErp('sample_transfer')` idempotente; PLM não emite NF nem
  soma saldo.
- **R9 — Rastreabilidade obrigatória.** Todo `showroom_sample` liga
  em `entity_relations` a: `reference`, `piloto` que originou,
  `showroom_kit`, `showroom_feedback[]`, `showroom_decision`.
- **R10 — Timeline única.** Nada de log próprio: `entity_events`
  com `entity_type='showroom_sample'` e `'showroom_kit'`.

Onde cada regra é aplicada:

| Regra | Camada (DB / server fn / client) | Referência de código |
|-------|----------------------------------|----------------------|
| R1    | DB (sem tabela `products`) + server fn `getShowroomSku` | `src/lib/erp/*`, `src/hooks/use-erp.ts` |
| R2    | DB (sem coluna `stock_qty` em `showroom_sample`)         | migration `showroom_*` |
| R3    | Client via `<ErpBadge/>` na ficha digital                 | `src/components/erp/ErpBadge.tsx` |
| R4    | Server fn `publishShowroom` (valida `quality_capa.status`) | `src/lib/showroom/*.functions.ts` |
| R5    | DB (`showroom_feedback` com enum `dimensao` + `nota` CHECK 1..5) | migration |
| R6    | Server fn `recordLaunchDecision` + trigger status | `src/lib/showroom/*.functions.ts` |
| R7    | Client (reuso de `asset_attachments`)                    | `src/components/showroom/*` |
| R8    | Server fn `requestSampleTransfer` via `ErpAdapter` | `src/lib/erp/*` |
| R9    | DB (`entity_relations` inserts obrigatórios em trigger) | migration |
| R10   | DB (`entity_events` + triggers)                         | reuso do padrão H2-04 |

## 6. Workflow (V8)

**Máquina `showroom_sample`:**

```text
solicitada → recebida → em_curadoria → aprovada → em_kit → em_showroom → retornada → arquivada
                                    ↘ reprovada → devolvida
```

**Máquina `showroom_publication` (ficha digital):**

```text
rascunho → em_revisao → publicada → congelada (após decisão de lançamento)
                     ↘ rejeitada → rascunho
```

**Máquina `showroom_decision`:**

```text
pendente → go | no_go | revisar
```

- Máquinas registradas em `workflow_definitions`? SIM (a incluir na
  migration deste elo).
- Transições proibidas listadas? SIM (ex.: `reprovada → em_kit`,
  `arquivada → qualquer`, `publicada → rascunho`).
- Quem pode transicionar (papel / `has_role`):
  - Coordenação de Produto: `em_curadoria → aprovada|reprovada`
  - Merchandising: `aprovada → em_kit → em_showroom`
  - Comercial/Showroom: `em_showroom → retornada`
  - Coordenação de Produto: `showroom_decision` (`pendente → go|no_go|revisar`)
  - Publicação exige `has_role(_,'coordenador')` ou `'diretor_produto'`.

## 7. Eventos emitidos (V7)

| `event_type`                       | Quando | Payload mínimo | Consumido por |
|------------------------------------|--------|----------------|---------------|
| `sample.requested`                 | Kit físico é solicitado à produção | `{reference_id, grade, cor, quantidade}` | PCP (H9-05), Timeline |
| `sample.received`                  | Peça-mãe entra no showroom | `{sample_id, recebido_por}` | Timeline, KPI lead time |
| `sample.approved` / `sample.rejected` | Curadoria decide | `{sample_id, motivo?}` | Ficha, KPI qualidade |
| `sample.transfer.requested`        | Remessa ao ERP idempotente | `{sample_id, route_id, erp_idempotency_key}` | Auditoria + ERP |
| `kit.assembled`                    | Kit por rota fechado | `{kit_id, route_id, sample_ids[]}` | Comercial, Timeline |
| `showroom.published`               | Ficha digital publicada | `{publication_id, reference_ids[]}` | Comercial, Marketing, H9-10 |
| `feedback.captured`                | Feedback estruturado gravado | `{feedback_id, reference_id, dimensao, nota}` | BI, IA (V11), H9-14 |
| `reference.launch_decision`        | Go / No-Go / Revisar | `{reference_id, decision, motivo, decidido_por}` | H9-10, H9-02 (revisão) |
| `showroom.capa.autoopen`           | Defeito recorrente vira CAPA | `{capa_id, reference_id, ocorrencias}` | H9-07 |
| `showroom.frozen`                  | Publicação congelada após lançamento | `{publication_id}` | Auditoria |

## 8. Integrações (H6)

- **ERP (H6-02):** `getProduct(erp_id)` (preço, EAN, descrição fiscal),
  `getStock(erp_id, type='SAMPLE')` (posição lógica),
  `writeErp('sample_transfer', {...})` idempotente,
  `getInvoice(sample_transfer_id)` (para exibir status da remessa).
- **CAD/PDM (H6-03):** N/A — mostruário lê da referência já engenheirada.
- **E-commerce (H6-04):** N/A neste elo. Publicação e-com é H9-10.
- **Webhooks/Cron (H6-05):** cron diário `showroom_coverage_watchdog`
  gera alerta quando `coverage < meta` a `T-D` do sell-in.

## 9. UX (V4 / H4)

- **Rota(s):** `/showroom` (grade da coleção com estado por peça-mãe),
  `/showroom/publicacao/:id` (ficha digital), `/showroom/rotas` (kits
  por representante), `/showroom/feedback` (captura estruturada).
- **Componentes contextuais:** `EntityDrawer` para `showroom_sample`
  e `showroom_publication` com abas: Resumo, Timeline (`EntityTimeline`),
  Relações (`EntityRelations` — referência, piloto, kit, feedbacks,
  decisão), Feedback, ERP (via `ErpBadge`), Anexos, Auditoria.
- **Fluxo em cliques (H4-04):**
  - Aprovar peça-mãe: 2 cliques (drawer → botão "Aprovar").
  - Registrar feedback: 3 cliques (referência → "Feedback" → salvar).
  - Decidir Go/No-Go: 2 cliques + justificativa obrigatória.
- **Estados:** vazio (sem peça-mãe recebida), carregando, erro (ERP
  offline com fallback + retry), sucesso, bloqueado por CAPA — todos
  cobertos.

## 10. IA (V11 / H5)

- **Agente(s) responsáveis (V13):**
  - **Curador de Mostruário:** sugere ordem de exibição, agrupa por
    storytelling, aponta lacunas de grade/cor.
  - **Analista de Feedback:** consolida `showroom_feedback`, detecta
    sinais fracos (ex.: 3 buyers reclamando de caimento antes do
    lançamento), abre alerta para revisar em vez de lançar.
  - **Copiloto Comercial (leitura):** responde "quais peças têm melhor
    percepção de preço até agora?" via `feedback.captured` + ERP price.
- **Perguntas que o agente deve responder sobre este elo:**
  - Quais referências ainda sem peça-mãe aprovada a T-D do sell-in?
  - Qual a nota média por dimensão por linha?
  - Existe padrão de rejeição (ex.: caimento em plus size)?
  - Quais Go recomendariam No-Go se olhassem o feedback?
- **Contexto vivo (H5-02):** `entity_events` (`sample.*`, `feedback.*`,
  `reference.launch_decision`), `showroom_feedback`, leitura ERP via
  adapter, `quality_capa` para bloqueios.
- **Guardrails:** IA **nunca** decide Go/No-Go automaticamente; só
  **recomenda** com justificativa e evidência. Nunca sugere preço
  (isso é ERP + Comercial). Nunca fabrica feedback ausente.

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
| `showroom_coverage` | `refs com sample.approved / refs planejadas` | % | ≥ 98% | Coordenação de Produto |
| `showroom_lead_time` | `avg(sample.approved − reference.aprovada)` | dias | ≤ 15 | PCP + Produto |
| `feedback_capture_rate` | `refs com ≥1 feedback / refs publicadas` | % | ≥ 80% | Comercial |
| `avg_feedback_score` | `avg(nota) por dimensão` | 1–5 | ≥ 3.8 | Produto |
| `go_ratio` | `decisions.go / decisions.total` | % | monitor | Diretoria |
| `capa_from_showroom` | `capas abertas com origem=showroom / mês` | inteiro | monitor | Qualidade |

Fonte: 100% derivado de `entity_events` e `showroom_feedback` — nunca
contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** `showroom_sample`, `showroom_kit`, `showroom_publication`,
  `showroom_feedback`, `showroom_decision` — policy por ação (SELECT /
  INSERT / UPDATE / DELETE) usando `is_member(auth.uid())` + role.
- **GRANT:** todo `public.showroom_*` com GRANT explícito na mesma
  migration (`authenticated`, `service_role`) — **sem `anon`**.
- **Realtime:** tópicos escopados por role (não broadcast global);
  cobrir o finding aberto de `REALTIME_BROADCAST_MISSING_SCOPE` neste
  elo — publicar em `showroom-live` **somente** se `is_member` e
  `has_role(_,'coordenador'|'merchandising'|'comercial'|'diretor_produto')`.
- **Papéis autorizados (`has_role`):**
  - `coordenador_produto`, `merchandising`, `comercial`, `showroom`,
    `diretor_produto` (decide Go/No-Go).
- **PII / dado sensível tratado:** feedback pode conter nome de
  buyer/representante — tratar como dado comercial restrito
  (`is_member` obrigatório, sem `anon`, exportação apenas por role
  `diretor_produto`).

## 13. Checklist de prontidão do playbook

- [x] Objetivo e KPI de sucesso definidos (§1)
- [x] Entradas e saídas rastreáveis a entidades (§3, §4)
- [ ] Regras de negócio codificadas em DB/server (§5) — migração pendente
- [ ] Workflow em `workflow_definitions` (§6) — pendente
- [x] Eventos declarados (§7) — emissão pendente após migração
- [x] Integrações via adapter/contrato (§8)
- [x] UX com drawer + timeline + estados cobertos (§9)
- [x] Agente IA com escopo e guardrails (§10)
- [x] KPI catalogado e derivado de eventos (§11)
- [ ] RLS + GRANT verificados (§12) — pendente com migração
- [ ] Design Review (V13 · 10 perguntas) aprovado
- [ ] QA (V12 · 12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

- **FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **H2 Domain:** H2-02, H2-03, H2-04, H2-05, H2-06
- **H3 Architecture:** H3-01, H3-02, H3-03, H3-04, H3-05
- **H4 Frontend:** H4-01, H4-02, H4-04, H4-05
- **H5 IA:** H5-02, H5-03, H5-05
- **H6 Integrações:** H6-02, H6-05
- **H7 Qualidade:** H7-01, H7-02, H7-03, H7-05
- **H8 Ops:** H8-02, H8-04, H8-05

## 15. Competitive Notes (V14)

| PLM | Como resolve este elo | Limitação | Como superamos |
|-----|-----------------------|-----------|----------------|
| Centric         | Módulo "Line Planning + Sample Tracking" robusto, com line sheet e workflow de amostra | Rigidez de UI, curva alta, pouca IA nativa em feedback | Drawer contextual + agente que consolida feedback como sinal fraco |
| PTC FlexPLM     | Sample lifecycle e sample calendar fortes | UI datada, integração com showroom externa via terceiros | Ficha digital publicável nativa + reuso de `EntityDrawer` |
| Lectra Kubix    | Line plan + digital showroom integrados | Foco em marca grande, custoso para confecção BR média | Nativo BR (facção, representante por rota) sem inflar escopo |
| Gerber Yunique  | Sample tracker OK, colaboração via comentário | Feedback pouco estruturado, difícil de virar BI | `showroom_feedback` como entidade estruturada, vira KPI direto |
| Collection Moda | Coleção + mostruário nativos, forte em BR | Fraco em workflow e evento, decisão fica em planilha | Máquina de estado real + `reference.launch_decision` auditável |
| Audaces Idea    | Ficha e piloto muito fortes | Mostruário pouco desenvolvido, sem sell-in | Playbook dedicado, integrado a H9-10 e H9-14 |

**Padrão mental comum extraído:** todos tratam mostruário como
"etapa de checklist"; poucos tratam como **fonte estruturada de sinal
comercial pré-lançamento**.
**Nossa aposta de superação:** mostruário é o ponto onde o **sinal
do mercado entra no digital thread** — cada feedback vira evento,
alimenta IA e retro para desenvolvimento em H9-14.

## 16. Riscos e mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Duplicar SKU no PLM ao rastrear peça-mãe | Vira ERP (bug de escopo) | Média | R1/R2/R8 + code review + linter que reprova `stock_qty`/`price` em `public.showroom_*` |
| Feedback vira campo texto livre | Perde valor para BI/IA | Alta | R5 (enum + nota) + validação Zod na server fn |
| CAPA aberta escapar para publicação | Perde credibilidade da coleção | Média | R4 no `publishShowroom` + trigger DB |
| Realtime vazando decisão de Go/No-Go | Risco comercial/vazamento | Média | Escopo `is_member` + role no tópico `showroom-live` |
| Peça-mãe fica "perdida" em rota | Retrabalho, atraso de sell-in | Alta | Máquina de estado `em_showroom → retornada` + cron `showroom_coverage_watchdog` |
| Decisão de Go sem evidência | Lançamento ruim, encalhe | Média | UI exige justificativa; IA sinaliza divergência entre feedback e decisão |

## 17. Changelog do playbook

| Data       | Versão | Autor          | Mudança  |
|------------|--------|----------------|----------|
| 2026-07-08 | 0.1    | Handbook Team  | criação  |
