# Onda 96 — primitivos de UI (acessibilidade) em pt-BR

## Sintoma medido em produção

No diálogo "Cadastrar fornecedor", o botão de fechar tem nome acessível
**"Close"** (lido por leitor de tela em inglês) — `auditoria/a11y96-prod-antes.png`.
Mesma origem (primitivos shadcn): `Sheet` "Close", paginação "Previous/Next"

- `aria-label="Go to previous/next page"` + "More pages", carrossel
  "Previous/Next slide", breadcrumb "More", sidebar "Toggle Sidebar" (×3).

## Correção

- `dialog.tsx`/`sheet.tsx`: "Fechar"; `pagination.tsx`: "Anterior"/"Próxima",
  "Ir para a página anterior/próxima página", "Mais páginas"; `carousel.tsx`:
  "Slide anterior"/"Próximo slide"; `breadcrumb.tsx`: "Mais"; `sidebar.tsx`:
  "Alternar menu lateral".
- 2 testes de diálogo atualizados de `name: "Close"` para `name: "Fechar"`
  (asserção equivalente, não relaxada).
- Trava `onda96-primitivos-ui-pt-br.test.ts` (2): nenhum rótulo em inglês em
  `components/ui`.
- Varredura ampla por strings de UI em inglês fora de `ui/` ("Loading…",
  "No results", "Something went wrong"…) → nenhuma.

## Prova (Playwright, `scripts/prova_a11y.py`)

Local: botões do diálogo `['Cadastrar', 'Fechar']`, 0 `pageerror`
(`auditoria/a11y96-local.png`). Produção antes: `['Cadastrar', 'Close']`.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 911/911 (150 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesmo diálogo em produção → "Fechar".
