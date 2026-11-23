# Onda 117 — axe-core (WCAG AA): contraste, barras de progresso e regiões roláveis

## Medição (112ª, produção = Onda 114)

`scripts/provas/auditoria_axe.py` (novo; `axe-core` em devDependencies):
roda axe (wcag2a/2aa/21aa) em cada uma das 44 rotas e conta violações
**serious/critical**.

- **43 de 44 rotas com violação** — `color-contrast` 172, `aria-progressbar-name` 28,
  `scrollable-region-focusable` 6.
- Sistêmicos: rótulos de seção do menu (`text-muted-foreground/70`, 2,99:1,
  em todas as rotas); verde `--success-500` como texto (4,41:1); âmbar
  (`amber-600` #837d5b, 3,98:1; `amber-500` 2,6:1 em textos de alerta);
  `text-muted-foreground/80|/90`; "cm" com `opacity-60`; `<Progress>` sem
  nome; tabelas/listas roláveis sem foco de teclado.

## Correção

- `styles.css`: `--success-500 173 40% 31%`, `--warning-500 48 40% 34%`,
  `--color-amber-600 #6f6a4c` no claro (≥4,5:1); escuro mantém tons originais.
- `_authenticated.tsx`: rótulos de seção sem `/70`. `text-muted-foreground/80|/90` → pleno.
  `text-amber-500` → `text-amber-600`, e todo `text-amber-600` ganha `dark:text-amber-400`.
  Audit: cartões `bg-black/20` → `bg-muted/40`. Suppliers: `rose-500/600` → `rose-700`.
- `ui/progress.tsx`: `aria-label="Progresso: N%"` por padrão.
- `ui/table.tsx` + 10 contêineres `overflow-*`: `tabIndex={0}`.

## Prova

- Local (mesmo auditor): **43/44 → 5/44** rotas com violação; contraste 172 → 8
  (restantes: texto sobre amostras de cor em `/colors`, 2 badges em marketing,
  1 em influencers/pieces-report), progressbar 28 → 0, roláveis 6 → 1.
- Trava `src/lib/onboarding/onda117-axe-contraste.test.ts` (5).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **983/983 (174)**.

## Pendente

Publicar 115–117; depois `auditoria_axe.py https://plmuse.lovable.app` → ≤5/44.
