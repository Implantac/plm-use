# Reorganização do USE MODA PLM em fluxo orientado a processo

Diretriz recebida: transformar o projeto em um PLM orientado ao ciclo de vida do produto, sem recriar nada. O plano abaixo é incremental, reaproveita 100% do que já existe (rotas, tabelas, componentes, hooks, eventos, workflows) e entrega valor em ondas curtas.

## Princípios inegociáveis desta reorganização

- Zero remoção de rotas, tabelas, componentes ou hooks existentes.
- Zero migration destrutiva. Toda mudança de schema é aditiva (novas colunas/tabelas de suporte, nunca DROP).
- Toda nova camada de navegação é um *wrapper* sobre o que já está no `src/routes/_authenticated.*`.
- Todo avanço de etapa emite evento em `entity_events` e respeita `workflow_definitions` / `reference_transitions`.
- PLM nunca vira ERP: dados de estoque, custo, pedido continuam via `ErpAdapter`.

## Onda 0 — Auditoria (entrega: documento, zero código)

Produzir `.lovable/docs/00-fpef/AUDIT-2026-07.md` mapeando, a partir da árvore atual:

1. Matriz **Rota → Entidade → Etapa do ciclo** (usa as 40+ rotas `_authenticated.*` já listadas em `src/routeTree.gen.ts`).
2. Componentes reaproveitáveis já existentes (EntityDrawer, EntityTimeline, ModuleLayout, ModuleTabs, PCPFlowDiagram, IniciarPCPDialog, WorkflowStatusMenu, etc.).
3. Gaps de workflow: quais entidades já têm transições em `workflow_definitions` e quais só usam campo `status`.
4. Gaps de digital thread: entidades sem `entity_relations` de origem/consequência.
5. Lista de rotas órfãs (sem entrada de menu) e rotas duplicadas de conceito.

Sem esta auditoria escrita, nenhuma onda seguinte começa.

## Onda 1 — Navegação por processo (só shell, nenhuma rota nova)

Reorganizar `ModuleTabs` / sidebar em 5 grupos cronológicos, apontando para as rotas que já existem:

```text
DESENVOLVER PRODUTO    research · moodboard · collections · references · cad · tech-sheet · prototypes
INDUSTRIALIZAR         (novo shell /industrialization sobre tech-sheet + quality + gate)
PLANEJAR PRODUCAO      (novo shell /planning sobre inventory + suppliers + planner)
ACOMPANHAR PRODUCAO    production · production.today · quality · supplier-portal
ENCERRAR               launch · showroom · commercial · analytics
```

Os "novos shells" são páginas *hub* que embutem os componentes existentes via `<ModuleLayout>` + tabs — não novas telas de negócio.

## Onda 2 — Industrial Readiness Gate

Uma tela `/industrialization/gate/$referenceId` (novo shell) que apenas *lê* o estado atual e mostra checklist:

- Piloto aprovado (consulta `pilotos.status = APROVADO`)
- BOM completa (tech_sheets + itens já existentes)
- Custo/consumo calculado (PreCostPanel já existe)
- Operações cadastradas (OperationSequencePanel já existe)
- Aprovação gerência (nova coluna `references.industrialization_approved_by uuid null` — aditivo)

Ação "Liberar para PCP" só habilita quando checklist verde. Emite evento `reference.industrialization_released` em `entity_events` e cria relação em `entity_relations` (reference → central de necessidades).

Migração aditiva mínima: 2 colunas em `references` + 1 linha em `workflow_definitions`.

## Onda 3 — Central de Necessidades (porta de entrada do PCP)

Rota `/planning/needs` que consolida o que já existe:

- Lista referências liberadas pelo Gate (Onda 2).
- Consome `ErpAdapter` (mock atual) para estoque/saldo.
- Reaproveita `AbcCoveragePanel`, `ConsumoPanel`, `CapacityPanel`, `SupplierScoreboard`.
- Botão "Gerar OP" só aparece após análise (registra evento `pcp.op.generated_from_needs`).

`PCPFlowDiagram` passa a iniciar a partir de `/planning/needs`, não mais do `IniciarPCPDialog` isolado.

## Onda 4 — Digital thread completa

Para cada entidade sem relações de origem/consequência (lista sai da auditoria), inserir em `entity_relations` os elos faltantes via trigger ou backfill. Zero UI nova — apenas o timeline existente passa a mostrar mais.

## Onda 5 — QA de regressão

Playwright (já configurado em `tests/e2e/`) cobrindo:

- Todas as rotas `_authenticated.*` continuam abrindo (smoke).
- Fluxo Pesquisa → Referência → Piloto → Gate → Central → OP em um único percurso.
- RLS: `use-pilotos.rls.test.tsx` e `use-stock.rls.test.tsx` continuam verdes.

## Detalhes técnicos

- **Migrações**: só aditivas. Padrão H2-03 (GRANT + RLS + policies + trigger `updated_at`). Nenhum DROP, nenhum RENAME.
- **Workflow**: novas transições entram em `workflow_definitions` (tabela já existe), nunca em `switch` de componente.
- **Eventos**: cada ação de Gate/Central emite via os triggers já existentes ou via `INSERT INTO entity_events` em server function autenticada com `requireSupabaseAuth`.
- **Navegação**: `ModuleTabs` recebe uma prop `group` nova (`develop | industrialize | plan | follow | close`) mantendo `admin` atual.
- **Reuso obrigatório**: `EntityDrawer`, `EntityTimeline`, `ModuleLayout`, `WorkflowStatusMenu`, `PCPFlowDiagram`, `IniciarPCPDialog`, painéis de `techsheet/*`, `inventory/*`, `pcp/*`. Nenhum componente novo se um existente resolve.
- **Backend**: server functions vivem em `src/lib/**.functions.ts`. Nada de edge function para lógica interna.

## O que este plano NÃO faz

- Não apaga rotas atuais (`/production`, `/inventory`, `/tech-sheet`, etc.) — elas continuam acessíveis diretamente e passam a ser também alcançadas via os hubs.
- Não altera `src/integrations/supabase/*` (auto-gen).
- Não toca UI de módulos que já estão prontos — só adiciona a camada de orquestração cronológica por cima.
- Não introduz novo design system nem novos tokens.

## Próximo passo pedido ao usuário

Confirmar por qual onda começamos. Recomendação: **Onda 0 (auditoria escrita)** antes de qualquer código, exatamente como a diretriz exige na Fase 1.
