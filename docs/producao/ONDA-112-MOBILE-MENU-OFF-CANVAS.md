# Onda 112 — No celular, o conteúdo aparece (menu off-canvas)

## Medição (107ª, produção, Onda 110 no ar)

Novo `scripts/provas/auditoria_mobile.py` (viewport 390×844, toque): overflow
horizontal, largura do `<main>` e alvos de toque < 24px. Resultado nas 44
rotas: **o menu lateral (276px) nasce aberto e o `<main>` fica com 114px dos
390px** — o conteúdo de toda rota aparece cortado, sem barra de rolagem
horizontal (`auditoria/mobile112-prod-antes.png`). `prova_mobile_menu.py` em
produção: `inicial: aside visível: True | main: 114 px`, sem backdrop, e o menu
continua aberto após navegar.

Também: no header, PresenceBar + "AI Product Studio" estouravam a largura e
**cobriam o botão de menu** (clique interceptado). Três CTAs de texto com alvo
< 24px (`digital-twin`, `route-engineering`, `feed` — este com texto quebrado
"acompanhar o pc p").

Sem achados em: overflow horizontal, `img` sem `alt`, `target=_blank` sem
`noopener`, foco invisível (`auditoria_midia_foco.py`, 44 rotas: 0).

## Correção (`src/routes/_authenticated.tsx`)

- `matchMedia("(max-width: 1023px)")`: abaixo de 1024px o menu começa
  recolhido (sem gravar a preferência de desktop) e fecha ao mudar de rota.
- Aberto em tela estreita, o `<aside>` é `fixed` sobre o conteúdo com backdrop
  (`button aria-label="Fechar menu lateral"`); em `lg:` volta a ser coluna.
- Header: PresenceBar só em `md:`; CTA "AI Product Studio" vira ícone com
  `aria-label` abaixo de `sm:`; padding do conteúdo `p-4 sm:p-6`.
- CTAs: `inline-flex min-h-11`; feed: "Acompanhar o PCP" / "pelo PCP".

## Prova

- Local (vite 5179) `prova_mobile_menu.py`: `inicial: aside visível: False | main: 390 px`
  → abre com `backdrop: 1` e `main: 390 px` → após navegar para /feed `aside visível: False`.
  Screenshots `auditoria/mobile112-local-{fechado,aberto}.png`.
- `auditoria_mobile.py` local, 44 rotas: **0 rotas com problema**, 0 pageerror.
- Trava `src/lib/onboarding/onda112-mobile-menu.test.ts` (4).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **967/967 (169)**.

## Pendente

Publicar 111+112; depois `prova_mobile_menu.py` e `auditoria_mobile.py` em produção.
