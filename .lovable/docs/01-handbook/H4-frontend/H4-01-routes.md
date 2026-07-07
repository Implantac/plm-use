# H4-01 · Estrutura de rotas e composição

TanStack Start com file-based routing em `src/routes/`.

## Convenções
- Home: `src/routes/index.tsx`
- Rotas autenticadas: `src/routes/_authenticated.<segmento>.tsx`
- Rotas públicas: no topo (auth, sitemap, audit)
- Layouts: arquivo pai com `<Outlet />` — nunca importar filho manualmente
- Nunca usar `src/pages/` (convenção de outro framework)
- Nunca editar `src/routeTree.gen.ts` (auto-gerado)

## Head e SEO
Toda rota de conteúdo define `head()` com título e descrição próprios.
`og:image` só em rota folha, nunca no root. Nada de "Lovable App" default.

## Rota nova (checklist)
1. Existe? Não duplique — reuse composição contextual (Drawer).
2. Criar arquivo em `src/routes/`.
3. Definir `errorComponent` e `notFoundComponent`.
4. Loader chama server fn tipada; nunca `supabase` direto se envolve auth.
5. Componente usa `useSuspenseQuery` sobre a mesma `queryOptions` do loader.
6. Link tipado com `<Link to="/rota">` — nunca `<a href>`.

## Anti-padrões
- Rota que agrega tudo com âncoras `#secao` para páginas distintas.
- `useEffect + fetch` para dados iniciais.
- Auth check via `useEffect + navigate('/auth')` em vez de `_authenticated/`.
- Layout sem `<Outlet />` — filha renderiza vazio.
