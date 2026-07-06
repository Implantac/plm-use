# Onda Fundação — Espinha Dorsal do PLM

Objetivo: transformar o produto de "coleção de telas" em "PLM com núcleo".
Três entregas encadeadas, sem quebrar nada existente, sem virar ERP.

**Princípio inegociável:** o PLM **não é fonte da verdade** para Produto,
Estoque, Fornecedor, Pedido, NF, Financeiro, OP fabril, Cliente. Essas
entidades pertencem ao ERP. O PLM apenas **referencia** (por chave externa
`erp_id` + snapshot leve) e **consome via adapter read-only**.

---

## Entrega 1 — Núcleo `references` + eventos polimórficos

### O que faz
Cria a entidade unificada de Referência (a peça em desenvolvimento) com
workflow real de estados, e um motor de eventos reutilizável para qualquer
entidade do sistema (referência, lote, ficha, piloto, CAPA, etc).

### Migrations (schema)

**`references`** — entidade central do PLM (peça sendo desenvolvida)
- `code` (código de negócio, único), `name`, `collection_id` (soft ref),
  `theme`, `line`, `season`, `designer_id`, `modelista_id`,
  `status` (enum: `IDEIA | CROQUI | MODELAGEM | PILOTO | AJUSTE | APROVACAO | ENGENHARIA | PRODUCAO | FINALIZADA | ARQUIVADA`),
  `priority`, `target_cost`, `target_price`, `image_url`,
  `erp_product_id` (nullable — preenchido quando industrializa), `metadata` jsonb,
  auditoria completa (created_by/at, updated_by/at).
- Índices em `status`, `collection_id`, `code`.

**`reference_transitions`** — máquina de estados versionada em tabela
(from_status, to_status, requires_role, requires_checklist jsonb). Permite
customizar workflow sem redeploy.

**`entity_events`** — motor polimórfico único
- `entity_type` (enum: `reference | lote | tech_sheet | piloto | capa | engenharia | facao_order`)
- `entity_id` uuid, `event_type` (`created | status_changed | commented | approved | rejected | assigned | attached | linked | erp_synced | ...`)
- `from_status`, `to_status`, `payload` jsonb, `actor_id`, `actor_name`, `created_at`.
- Índice composto `(entity_type, entity_id, created_at desc)` para timeline.

**`entity_relations`** — grafo de relacionamentos entre entidades
- `(from_type, from_id) → (to_type, to_id)` com `relation`
  (`derives_from | has_tech_sheet | has_piloto | produced_in_lote | capa_for | uses_material_erp | supplied_by_erp`).
- Permite "abrir uma referência e ver tudo conectado a ela" sem joins hard-coded.

**Grants + RLS** em todas: leitura por `authenticated`, escrita por autor/manager,
`service_role` full. Realtime habilitado em `references` e `entity_events`.

### Funções SQL
- `public.log_event(...)` security definer — grava em `entity_events`.
- `public.can_transition_reference(from, to)` — consulta `reference_transitions`.
- Trigger `references_status_change` → grava evento automático ao mudar status.

### Client
- `src/hooks/use-references.ts` — CRUD, transições validadas, realtime.
- `src/hooks/use-entity-events.ts` — `useTimeline(entityType, entityId)` genérico.
- `src/hooks/use-entity-relations.ts` — `useRelated(entityType, entityId)`.

### Migração de dados existentes
- Nenhuma destruição. Zustand `useReferenceStore` continua funcionando.
- Adicionado botão "Publicar no núcleo" nas telas de Development/Reference
  que faz upsert em `references` (opt-in, incremental).

---

## Entrega 2 — Drawer Universal de Entidade

### O que faz
Um único componente `<EntityDrawer type="reference" id="..." />` invocável
de qualquer módulo, mostrando o painel completo padronizado do manifesto:
Resumo, Indicadores, Timeline, Comentários, Documentos, Relacionamentos,
Histórico, Responsáveis, Checklist, Workflow, Auditoria.

### Componentes
- `src/components/entity/EntityDrawer.tsx` — shell com tabs padronizadas.
- `src/components/entity/EntitySummary.tsx` — cabeçalho + KPIs + ações rápidas.
- `src/components/entity/EntityTimeline.tsx` — consome `entity_events` (unifica
  o que hoje é `LoteTimeline` + `capa_events` + activity_log).
- `src/components/entity/EntityRelations.tsx` — grafo enxuto: "Ficha técnica v3",
  "Piloto aprovado", "Lote 2601 em Costura", "CAPA #12 aberta", "Material ERP-XYZ".
- `src/components/entity/EntityWorkflow.tsx` — stepper com próximas transições
  válidas + gates de checklist.
- `src/components/entity/EntityContext.tsx` — provider global; `useOpenEntity()`
  em qualquer lugar abre o drawer.

### Integrações (sem reescrever telas)
- Development, Tech-Sheet, Production (dialog do lote), Quality (CAPA),
  Suppliers passam a chamar `openEntity({type,id})` em vez de drawers próprios,
  **mantendo os drawers atuais como fallback** enquanto a migração ocorre.
- Cmd+K (GlobalSearch) ganha "abrir no drawer" além de "navegar".

---

## Entrega 3 — Camada ERP (adapter read-only)

### O que faz
Define o **contrato** de consumo do ERP e uma implementação **mock trocável**,
sem incluir escrita e sem duplicar entidades do ERP no PLM.

### Arquitetura
- `src/lib/erp/contract.ts` — interfaces TypeScript puras:
  `ErpProduct`, `ErpSupplier`, `ErpStockLevel`, `ErpPurchaseOrder`,
  `ErpProductionOrder`. Só campos que o PLM realmente lê.
- `src/lib/erp/adapter.ts` — interface `ErpAdapter` com métodos
  `getProduct(id)`, `searchProducts(q)`, `getSupplier(id)`, `getStock(sku)`,
  `listPurchaseOrders({filter})`, `listProductionOrders({filter})`.
  **Nenhum método `create/update/delete`.**
- `src/lib/erp/mock-adapter.ts` — implementação que devolve dados dos seeds
  atuais, com latência simulada e taxa de erro configurável.
- `src/lib/erp/http-adapter.ts` (stub) — placeholder para adapter HTTP real
  (documenta variáveis de ambiente esperadas; **não** implementado agora).
- `src/lib/erp/index.ts` — factory que escolhe adapter por `VITE_ERP_MODE`.
- `src/hooks/use-erp.ts` — hooks React Query com cache, retry, fallback UI
  de indisponibilidade.

### Uso
- Componente `<ErpBadge productId="..." />` mostra dados vindos do ERP com
  ícone "external", tooltip "Fonte: ERP · sincronizado há Xmin", e estado
  de erro tratado.
- `entity_relations` guarda apenas `erp_id` (string opaca) — nunca copia
  produto/estoque/fornecedor para tabelas do PLM.

### O que NÃO fazemos (e por quê)
- Não criar tabelas `products`, `suppliers`, `stock`, `purchase_orders`,
  `financial_*` no PLM. Isso seria ERP.
- Não escrever no ERP nesta onda. Escrita virá em onda posterior via
  outbox pattern, se e quando necessário.
- Não sincronizar em background agora. Consultas são pull sob demanda com
  cache curto. Sync incremental é onda futura.

---

## Fora de escopo desta onda

- Reagrupamento das 25 rotas em 6 áreas → onda seguinte de UX.
- Copiloto Industrial (IA) → onda seguinte, consome `entity_events` e adapter ERP.
- Workflows automáticos (piloto aprovado → cria engenharia) → viáveis
  após Entrega 1, mas serão outra onda para não inflar esta.
- BI consolidado (views materializadas) → depende de volume de eventos reais.

---

## Definition of Done desta onda

- [ ] Migrations aplicadas com GRANT + RLS + realtime.
- [ ] Referência criável, transições validadas, timeline visível no drawer universal.
- [ ] Drawer universal invocável de Development, Production e Quality sem regressão.
- [ ] `LoteTimeline` e `capa_events` migrados para leitura via `useTimeline` genérico
      (mantendo compatibilidade).
- [ ] `ErpAdapter` mock em uso em pelo menos um ponto (ex.: exibição de fornecedor
      na CAPA e material na ficha técnica) via `<ErpBadge/>`.
- [ ] Nenhuma tabela nova do PLM duplicando escopo do ERP.
- [ ] Nenhum store existente removido; migração é opt-in.

---

## Ordem de execução proposta

1. Migration do núcleo (`references`, `entity_events`, `entity_relations`,
   `reference_transitions`, funções e triggers, grants, realtime).
2. Hooks `use-references`, `use-entity-events`, `use-entity-relations`.
3. Contrato + mock adapter ERP + `use-erp`.
4. `EntityDrawer` + subcomponentes + provider global.
5. Integração incremental: Development → Production → Quality.
6. Refactor de `LoteTimeline` para consumir `useTimeline` (sem quebrar UI).

Confirma este escopo para eu começar pela migration do núcleo?
