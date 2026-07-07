# Fashion PLM Enterprise Framework (FPEF)

> A constituição do produto. Todo prompt, toda tela, toda migration passa por aqui antes de virar código.
> Este framework **não substitui** o que já existe — ele **organiza** e **fecha lacunas**.

## Princípios inegociáveis

1. **PLM não é ERP.** Nunca duplicamos Produto, Estoque, Fornecedor, Pedido, NF, Financeiro, OP fabril.
   Referenciamos via `erp_id` + adapter read-only (`src/lib/erp/`).
2. **Nada isolado.** Toda entidade tem origem e destino conectados (Digital Thread — V3).
3. **Contextual, não navegacional.** Abrir referência = drawer com tudo. Não é "outra tela" (V4).
4. **Toda ação gera evento.** Timeline, dashboard, BI e IA se alimentam de `entity_events` (V7).
5. **Nenhuma tela é pronta** sem passar no Quality Gate (V12).

## Os 12 Volumes

| # | Volume | Estado | Arquivo |
|---|--------|--------|---------|
| 1 | Product Vision | 🟡 parcial | [01-product-vision.md](./01-product-vision.md) |
| 2 | Conhecimento da Moda | 🟡 parcial | [02-fashion-knowledge.md](./02-fashion-knowledge.md) |
| 3 | Digital Thread | 🟠 núcleo criado, cadeia incompleta | [03-digital-thread.md](./03-digital-thread.md) |
| 4 | UX Bible | 🟡 drawer existe, uso parcial | [04-ux-bible.md](./04-ux-bible.md) |
| 5 | Domain Model | 🟠 entidades soltas, sem catálogo | [05-domain-model.md](./05-domain-model.md) |
| 6 | Business Rules | 🟡 escritas em docs, não executáveis | [06-business-rules.md](./06-business-rules.md) |
| 7 | Event Engine | 🟢 funcional | [07-event-engine.md](./07-event-engine.md) |
| 8 | Workflow Engine | 🟠 só References | [08-workflow-engine.md](./08-workflow-engine.md) |
| 9 | ERP Connector | 🟢 mock funcional, sem HTTP | [09-erp-connector.md](./09-erp-connector.md) |
| 10 | BI | 🟡 telas soltas, sem catálogo de KPIs | [10-bi.md](./10-bi.md) |
| 11 | IA Industrial | 🟠 3 agentes, sem contexto de eventos | [11-ai-industrial.md](./11-ai-industrial.md) |
| 12 | Quality Assurance | 🔴 checklist não formalizado | [12-quality-assurance.md](./12-quality-assurance.md) |

Legenda: 🟢 pronto · 🟡 parcial · 🟠 gap significativo · 🔴 inexistente

## Como usar

**Antes de codar uma tela nova ou módulo:**
1. Leia V1 (visão) e V5 (entidades envolvidas).
2. Consulte V6 (regras) e V8 (workflow) da entidade em questão.
3. Aplique V4 (drawer contextual, não nova rota se possível).
4. Garanta V7 (emitir eventos) e V10 (KPI derivado).
5. Se toca dado do ERP, use V9 (adapter, nunca duplicar).
6. Feche com V12 (checklist).

**Antes de PR:** V12 é gate. Sem checklist verde, tela é incompleta.

## O que já não vamos refazer

- `references`, `entity_events`, `entity_relations`, `reference_transitions` (tabelas ok)
- `EntityDrawer` + `EntityContext` (shell ok, faltam integrações)
- `ErpAdapter` mock (contrato ok)
- 3 agentes IA (`ai/agents.functions.ts`) — falta consumir eventos
- Zustand stores atuais permanecem — migração pro núcleo é opt-in
