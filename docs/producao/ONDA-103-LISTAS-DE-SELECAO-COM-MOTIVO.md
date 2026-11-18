# Onda 103 — listas de seleção e leituras `.then(({ data }))` com motivo

## Sintoma medido em produção (`scripts/prova_movimentacao.py`)

`/inventory` → "Movimentação" com sessão inválida: campo Armazém fica em
"Selecione" **sem nenhuma opção e sem aviso** — o formulário trava em
"Selecione o armazém" e o operador não sabe que a leitura falhou
(`auditoria/movimentacao103-prod-antes.png`).

Mesma classe (`.then(({ data }) => …)` descartando `error`):

| Onde                                                                  | Antes                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `use-suppliers` → diálogos Novo Piloto / Nova Referência              | lista de fornecedores vazia = "nenhum cadastrado"                              |
| `use-workflow` → `WorkflowStatusMenu`                                 | "Nenhuma transição disponível" (botão desabilitado)                            |
| `use-entity-events` → `EntityTimeline`                                | "Sem eventos registrados ainda"                                                |
| `PilotosPanel` (resolve `references` por código)                      | **"Referência X ainda não está cadastrada em references"** — diagnóstico falso |
| `MovementDialog` / `ReservationDialog` (armazéns, OPs, lotes/pilotos) | selects vazios                                                                 |

## Correção

- Hooks expõem `error` (`descreverErroSupabase(erro, "carregar …")`).
- `EntityTimeline` e `PilotosPanel` mostram `role="alert"` com o motivo
  (PilotosPanel: "… Não dá para afirmar se a referência X está cadastrada.").
- `WorkflowStatusMenu`: com erro o botão continua clicável e o menu mostra o
  porquê.
- Diálogos de piloto/referência: motivo abaixo do campo Fornecedor.
- Diálogos de estoque: `loadErrors` dedupado, um aviso inline por motivo
  (sem toasts duplicados), limpo ao reabrir.
- Trava `onda103-listas-de-selecao-com-motivo.test.ts` (4) — inclui varredura
  global: nenhum `.then(({ data }) =>` em `src/{hooks,components,routes,lib}`
  (exceção: `use-auth.ts`, sessão).

## Prova

Local: diálogo "Movimentação" → alerta "Não foi possível carregar os
armazéns: sua sessão expirou ou é inválida…" + "…ordens de produção abertas…"
(`auditoria/movimentacao103-local.png`); 0 `pageerror`.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 941/941 (159 arquivos)**.

## Publicação

Nenhuma migration.
