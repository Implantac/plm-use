# V4 · UX Bible

## Princípio
**Contextual, não navegacional.** Clicou numa entidade → drawer com tudo.
Nova rota só quando o usuário realmente muda de contexto de trabalho.

## Padrão de drawer (obrigatório)
Tabs canônicas em `EntityDrawer`:
Resumo · Timeline · Ficha Técnica · Custos · Pilotos · Produção · Qualidade · Comentários · Documentos · Relacionamentos

## O que já existe
- `src/components/entity/EntityDrawer.tsx` — shell pronto
- `src/components/entity/EntityContext.tsx` — provider global `useEntityDrawer()`
- `src/components/entity/EntityTimeline.tsx` — timeline via `entity_events`
- `src/components/entity/EntityRelations.tsx` — grafo

## Onde já é usado
- Development (parcial)
- Production (dialog do lote — ainda usa `ReferenciaDrawer` legado)
- Quality (`CapaDrawer` legado)

## Gaps
- **Substituir** `ReferenciaDrawer` e `CapaDrawer` pelo `EntityDrawer` sem quebrar UX
- Tech-Sheet, Suppliers, Influencers ainda navegam por rota
- Cmd+K (`GlobalSearch`) deve oferecer "abrir no drawer" além de "navegar"
- Definir animação/tamanho padrão do drawer (design system)

## Doc completo herdado
`.lovable/docs/04-ux-bible.md` — mantém em vigor, este arquivo apenas amarra ao FPEF.
