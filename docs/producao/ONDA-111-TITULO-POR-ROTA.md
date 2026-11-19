# Onda 111 — Toda rota tem título próprio

**Regra:** cada rota autenticada declara `head()` com `<title>` específico
("Nome · USE MODA PLM"). Aba do navegador, histórico, favoritos e leitores de
tela deixam de mostrar o genérico do `index.html`.

## Medição (106ª, produção, Onda 110 no ar)

`scripts/provas/auditoria_titulos.py` (novo: `document.title`, `h1` visível,
`lang`, `<main>` por rota): **29 das 44 rotas** com o título genérico
"USE MODA PLM AI | Next-Gen Fashion Intel" — dashboard, feed, coleções,
materiais, financeiro, PCP, qualidade, fornecedores etc. Todas as 44 têm
exatamente 1 `h1`, `lang="pt-BR"` e 1 `<main>`.

Achado lateral: a descoberta de rotas das auditorias incluía o layout
`_authenticated.tsx` como rota "tsx" (404) — corrigido nos 4 auditores; a
contagem real é **44** rotas.

## Correção

`head: () => ({ meta: [{ title: "… · USE MODA PLM" }] })` nas 29 rotas, com
nome curto e em português (Painel, Atividade, Coleções, Materiais, Financeiro,
PCP, Produção do dia, Qualidade e CAPA, Fornecedores, Portal do fornecedor,
Governança e LGPD, Agentes de IA, …).

## Prova

- Local (vite 5179), 44 rotas: **0 títulos genéricos**, 0 rotas com problema,
  0 pageerror (`auditoria/titulos111-local.png`).
- Trava: `src/lib/onboarding/onda111-titulo-por-rota.test.ts` (2): 44 rotas,
  todas com `head()` + `title`, nenhuma com o genérico.
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **963/963 (168)**.

## Pendente

Publicar; depois `auditoria_titulos.py https://plmuse.lovable.app x.png` →
`TOTAL rotas com problema: 0`.
