# H4-02 · Data fetching

Padrão único: **TanStack Query + loader do Router**.

## Fluxo canônico

1. `queryOptions({ queryKey, queryFn: useServerFn(fn) })` em módulo próprio.
2. Loader: `context.queryClient.ensureQueryData(opts)`.
3. Componente: `useSuspenseQuery(opts)` — dados sempre presentes.
4. Mutação: `useMutation` chamando server fn + `queryClient.invalidateQueries`.

## Realtime

Assinar dentro de `useEffect`, remover no cleanup. Nunca no corpo do
componente (leak + custo alto). Ver `src/hooks/use-entity-events.ts`.

## Anti-padrões

- `useQuery` + `if (isLoading)` na primeira renderização (deveria vir do loader).
- `useEffect(() => { fetch(...) }, [])`.
- `supabase.channel(...).subscribe()` no corpo do componente.
- Invalidar todas as queries num `SIGNED_OUT` (401 storm — filtrar evento).
- Cache client-side de dado sensível de ERP.

## Erros de rede

`useSuspenseQuery` joga o erro no `errorComponent` da rota. Retry deve
chamar `router.invalidate()` **e** `reset()` — `reset()` sozinho não
re-executa o loader.
