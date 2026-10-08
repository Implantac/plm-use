# H4-04 · Componentes contextuais

Regra de ouro do UX Bible: **contexto > navegação**. O usuário abre o
detalhe onde está, sem perder o filtro/scroll/lista.

## Trilogia canônica

### 1. `EntityDrawer`

`src/components/entity/EntityDrawer.tsx` — abre à direita, sobre a lista.
Recebe `entity_type` + `entity_id`. Composto por abas:

- Overview (campos + status + workflow)
- Timeline (`EntityTimeline`)
- Relações (`EntityRelations`)
- Comentários (`CommentsPanel`)
- Anexos (via `comment_attachments` ou tabela dedicada)

### 2. `EntityTimeline`

`src/components/entity/EntityTimeline.tsx` — consome `useEntityTimeline`
com realtime. Renderização unificada por `event_type` (H2-04).

### 3. `EntityRelations`

`src/components/entity/EntityRelations.tsx` — grafo de vizinhança lida de
`entity_relations`. Cada nó abre outro Drawer (navegação contextual).

## Padrões complementares

- `WorkflowStatusMenu` — próximas transições via `use-workflow`
- `CommentsPanel` — polimórfico por `entity_type` + `entity_id`, com
  menções e anexos
- `PresenceBar` — quem está vendo/editando agora
- `AlertsBell` — inbox de notificações

## Regras

- Nunca criar página nova quando um Drawer resolve.
- Nunca criar Timeline/Relations por módulo — usar o canônico.
- Drawer nunca perde estado da lista atrás.
- URL reflete o Drawer aberto (`?entity=reference&id=...`) para link direto.
