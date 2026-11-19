# Onda 113 — No celular, nada fica cortado

## Medição (108ª, local com a Onda 112, pois o ar ainda é a 110)

`auditoria_mobile.py` ganhou a métrica **"cortados"**: elementos dentro de
`<main>` que ultrapassam a viewport (390px) sem ancestral rolável. Com o menu
já off-canvas (112): **18 rotas com conteúdo cortado** — suppliers 220,
production 165, research 159, quality 113, orders 109, commercial 106,
inventory 104, launch 72, development 69, prints 87, showroom 53…

Causa raiz única: o filho do viewport do `ScrollArea` (Radix) é
`display: table`, então cresce até o descendente mais largo (uma grade, uma
tabela, um texto `nowrap`) e **empurra a página inteira** — título, KPIs,
botões — para fora da tela, sem barra de rolagem (o `<main>` é
`overflow-hidden`). Em `/production` o `<h1>` tinha 3136px.

## Correção

- `src/components/ui/scroll-area.tsx`: `[&>div]:!block [&>div]:min-w-0` no
  Viewport — a largura passa a seguir a tela. Só isso derrubou suppliers
  220 → 6 e production 165 → 2.
- `src/components/ui/tabs.tsx`: `TabsList` com `max-w-full overflow-x-auto`
  (abas rolam em vez de estourar: launch, showroom, supplier-portal,
  route-engineering).
- Pontuais: seletor de visão do PCP rolável; grade de estampas 1 coluna em
  telas pequenas; tabelas de qualidade com `overflow-x-auto`; busca da CAPA
  em largura total; cabeçalho do card de fornecedor com `flex-wrap`/`min-w-0`.
- Auditor: `overflow: hidden` de um ancestral que cabe na tela conta como
  truncamento intencional (não como corte).

## Prova

- Local, 44 rotas em 390×844: **`TOTAL rotas com problema: 0`**, 0 pageerror
  (antes, na mesma build: 18 rotas). `auditoria/mobile113-local-suppliers.png`.
- Trava `src/lib/onboarding/onda113-conteudo-sem-corte-mobile.test.ts` (3).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **970/970 (170)**.

## Pendente

Publicar 111–113; depois `auditoria_mobile.py` em produção → 0.
