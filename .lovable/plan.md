# Plano de evolução — USE MODA PLM

Princípio: **evoluir sem quebrar**. Nenhuma rota atual será removida; URLs existentes seguem válidas (via redirect quando consolidadas). Nenhuma regra de negócio é alterada. Nenhum store existente é reescrito — apenas estendido.

---

## Onda 1 — Navegação & UX de comando (A+B)

Ganho de UX imediato, risco baixo. Tudo em frontend.

1. **Sidebar reorganizada** (`src/routes/_authenticated.tsx`)
   - Reagrupar "PLM · Produto" em 3 sub-grupos colapsáveis: **Pesquisa & Criação** (Pesquisa, Cores, Estampas, Displayagem, Looks), **Coleção** (Coleções, Mapa, Referências), **Engenharia** (Desenvolvimento, Protótipos, Ficha, Medidas, Relatório, CAD).
   - Reduzir de 14 → 3 linhas visíveis por padrão.
   - Persistir estado dos grupos em `localStorage`.
2. **Breadcrumb dinâmico** no header
   - Novo componente `AppBreadcrumb` derivado de `useRouterState().location.pathname` + mapa `route → label`.
   - Substitui o texto fixo "USE MODA AI › PLM Cockpit".
3. **Command Palette (Cmd+K)** — evolução do `GlobalSearch`
   - Adicionar seção **Quick Actions** contextuais por rota (ex.: em `/references` → "Nova referência", "Duplicar última"; em `/pcp` → "Nova OP").
   - Seção **Recentes** persistida em `localStorage`.
   - Seção **Favoritos** (pin/unpin).

Entregáveis: edição de `_authenticated.tsx`, `GlobalSearch.tsx`, novo `AppBreadcrumb.tsx`, novo `useRecentRoutes.ts`.

---

## Onda 2 — Digital Thread nos módulos novos (C+D)

Fecha FPEF V4 (contextual) e V7 (event engine) nos módulos criados recentemente.

1. **Adotar `EntityDrawer` + `EntityTimeline`** em `colors`, `prints`, `measurements`, `looks`, `display`, `collection-map`.
   - Edição de item passa a abrir drawer (padrão referências), não in-page.
   - Timeline exibe eventos daquela entidade.
2. **Emissão de `entity_events`** nas mutações dos stores correspondentes.
   - Estender `cloud-sync.ts` (ou criar `emitEvent` helper) para gravar eventos de `create/update/delete/approve` para cada tipo.
   - Nova migration: registrar os `entity_type` novos em `entity_events` (sem alterar schema — apenas whitelist se houver).
3. **`EntityRelations`** nos drawers para expor vínculos (cor → referências que usam; look → referências no board; medida → fichas técnicas vinculadas).

Entregáveis: 6 rotas ajustadas, 6 stores estendidos, 1 migration (apenas se houver enum/whitelist a ampliar).

---

## Onda 3 — Consolidação de rotas duplicadas (E+F+G)

Reduzir sidebar e cliques **sem apagar arquivos**. URLs originais viram redirect para a nova shell com aba pré-selecionada.

1. **Coleções unificadas** — nova shell `/collections` com abas: Overview • Mapa • Comparativo • Performance • ROI.
   - `/collection-map` → redireciona para `/collections?tab=map`.
2. **IA unificada** — shell `/ai-center` com abas: Copilot • Agentes • Live Context.
   - `/ai-agents` → redireciona para `/ai-center?tab=agents`.
3. **Administração unificada** — shell `/admin` com abas: Usuários • Segurança • Auditoria.
   - `/admin/users` e `/security` → redirecionam.
4. **Sidebar** reflete estrutura consolidada (menos itens).

Entregáveis: 3 wrappers com tabs, 3 rotas antigas viram redirect (`<Navigate />`), sidebar atualizada.

---

## Onda 4 — Lacunas do fluxo (H+I+J)

Fecha a sequência lógica completa do desenvolvimento de coleção.

1. **Contador de repilotagem visível** (H)
   - `PilotosPanel` e `ReferenceDrawer` mostram badge "Rodada N".
   - Deriva do count de registros em `pilotos` por referência (já existe hook `use-pilotos`).
   - Nenhuma alteração de schema.
2. **Tema e Família como facetas de Coleção** (I)
   - Estender `collections/store.ts` com campos `themes[]` e `families[]` (arrays de labels).
   - Drawer da coleção ganha 2 seções (Tema, Família) editáveis.
   - Referência ganha selectores `theme_id` / `family_id` opcionais.
   - Sem nova rota.
3. **Módulo Compras / Pedido de Compra** (J) — **única rota nova aprovada**
   - Nova rota `/purchases` sob "Supply Chain".
   - Nova store `purchases/store.ts` com `PurchaseOrder` (fornecedor, itens, status, vínculo a `stock_reservation`).
   - Nova migration: tabela `purchase_orders` + `purchase_order_items` com RLS + GRANT + timestamps + trigger + eventos.
   - Reusa `WorkflowStatusMenu`, `EntityDrawer`, `EntityTimeline`, `ExportMenu`.

Entregáveis Onda 4: 2 componentes atualizados, 1 store estendida, 1 nova store, 1 nova rota, 1 migration.

---

## Regras aplicadas a todas as ondas

- **Preservar**: rotas atuais, estados, integrações, eventos, RLS, workflows, permissões, timeline, histórico.
- **Reusar antes de criar**: `EntityDrawer`, `EntityTimeline`, `EntityRelations`, `WorkflowStatusMenu`, `ExportMenu`, `GlobalSearch`, `OptimizedImage`.
- **Sem cor hardcoded** — tokens do design system.
- **RLS + GRANT** em toda tabela nova (só Onda 4 cria tabela).
- **Emitir evento** em toda mutação relevante.
- **QA por onda**: build limpo, navegação, drawers, timeline, redirects funcionando.

---

## Ordem de execução

Onda 1 → aprovação → Onda 2 → aprovação → Onda 3 → aprovação → Onda 4.

Cada onda é auto-contida e não bloqueia rollback da anterior.
