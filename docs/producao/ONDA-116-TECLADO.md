# Onda 116 — Teclado: pular para o conteúdo e menu off-canvas acessível

## Medição (111ª, produção = Onda 114)

`scripts/provas/auditoria_teclado.py` (novo):

- Desktop: **56 a 64 Tabs** até o foco entrar no conteúdo, em todas as rotas
  medidas — o menu lateral tem ~40 links mais ~20 botões "Adicionar aos
  favoritos" invisíveis (`opacity-0`, só aparecem no hover), e não havia
  "pular para o conteúdo".
- Celular: menu off-canvas aberto por teclado **não recebia foco** (ficava
  no botão do header) e **Escape não fechava**.

## Correção (`src/routes/_authenticated.tsx`)

- Link "Pular para o conteúdo": primeiro elemento focável, invisível até
  receber foco (`sr-only focus:not-sr-only`), leva o foco a `<main id="conteudo" tabIndex={-1}>`.
- Menu estreito aberto: foco vai ao primeiro item; `Escape` fecha e devolve o
  foco ao botão "Expandir menu lateral".
- Botões de favorito: `focus-visible:opacity-100` — quem navega por Tab vê
  onde está.

## Prova

- Local: **1 Tab** até o conteúdo em todas as rotas medidas (antes 56–64);
  `menu aberto por teclado → foco: {'noAside': True}`; `Escape fecha o menu: True`.
  Screenshot `auditoria/teclado116-local-skiplink.png`.
- Trava `src/lib/onboarding/onda116-teclado.test.ts` (3).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **978/978 (173)**.

## Pendente

Publicar 115+116; depois `auditoria_teclado.py` em produção → 1 Tab, foco no menu, Escape fecha.
