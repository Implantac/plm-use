# Onda 93 — erro inline (`setError`/`setFatal`/`setHint`) com motivo

## Sintoma medido

A regra dos toasts (Ondas 85/92) não cobria o erro **inline**: 20 pontos em
`src` mostravam `res.error.message` cru dentro do diálogo/tela — e o mais
visível em produção era `/orders` e `/catalog`, que com sessão inválida
exibiam o texto do PostgREST em vez do motivo.

## Correção

- 20 pontos → `descreverErroSupabase(res.error, "ação")` / `motivoDe(e, "ação")`,
  preservando o atalho `isMissingTable → MIGRATION_HINT` em OrderDetail,
  catalog e orders. Arquivos: `ItemTechnicalDetailsDialog` (carregar os
  detalhes · salvar · criar o grupo · remover o grupo), `ItemConsumptionEditor`
  (carregar os materiais · salvar o consumo · adicionar o material · remover o
  material), `TechnicalSheetDialog`, `OrderProductionDetails`, `OrderDetail`
  (pedido · itens), `catalog`, `orders`, `CommentsPanel` (link de download ·
  prévia ×2), `use-references` ×2, `use-stock`.
- Mensagens "Seu texto/preenchimento continua na tela." preservadas após o
  motivo.
- Trava `onda93-erro-inline-com-motivo.test.ts` (2): varredura de `src` sem
  `set(Error|Fatal|Hint)(…\.message…)` fora do tradutor; ações presentes.
- 9 testes E2E do `CommentsPanel` **fortalecidos** (não relaxados): passaram a
  exigir o texto completo "Não foi possível carregar a prévia: <motivo>" em
  vez de só "<motivo>".

## Prova local (Vite dev, Playwright, `/orders` com sessão inválida)

Inline: **"Não foi possível carregar os pedidos: sua sessão expirou ou é
inválida. Entre novamente e repita a ação."**, 0 `pageerror`
(`auditoria/orders93-local.png`; script `scripts/prova_orders.py`).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 904/904 (147 arquivos)**.

## Publicação

Nenhuma migration. Validação: `/orders` em produção com sessão inválida →
inline com motivo (hoje mostra o texto cru do PostgREST).
