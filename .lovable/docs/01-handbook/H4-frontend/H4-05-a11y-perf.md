# H4-05 · Acessibilidade e performance

## Acessibilidade (mínimo obrigatório)

- Todo controle interativo tem role/aria implícito ou explícito.
- Foco visível em todos os elementos focáveis.
- Contraste AA (4.5:1 texto normal, 3:1 texto grande) — validar via token
  semântico, não à mão.
- Formulários: `label` associado, `aria-invalid`, `aria-describedby` para erro.
- Imagens de conteúdo têm `alt`. Decorativas: `alt=""`.
- Modal/Drawer: foco trap, ESC fecha, restaura foco anterior.
- Nada de `div onClick` sem role/tabIndex/keyboard.

## Performance

- Rota nova? Verificar bundle antes de shipar. Nada de importar `lodash`
  inteiro. Preferir tree-shakeable.
- Imagens: `OptimizedImage` (`src/components/OptimizedImage.tsx`) com
  `loading="lazy"` fora do above-the-fold.
- Lista longa: virtualização (`@tanstack/react-virtual`) quando > 200 itens.
- Realtime: assinar só o que a tela mostra. Fechar canal no unmount.
- Query stale time > 0 para dados que mudam pouco; use `staleTime` explícito.

## SSR

- Componentes com `window`/`document` no render → mover para `useEffect`.
- Hidratação: estado inicial no client deve bater com o server. Ler
  `localStorage` só depois de `useHydrated()`.

## Anti-padrões

- `useEffect(() => setTheme(localStorage...), [])` sem hydrated guard →
  flash + warning.
- `map` renderizando 10k linhas sem virtualização.
- Import `import * as Icons from 'lucide-react'`.
- `useState` inicializado com computação pesada — usar callback form.
