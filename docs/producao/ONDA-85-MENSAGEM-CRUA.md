# Onda 85 — Nenhuma mensagem crua do banco chega ao usuário

**Data:** 2026-10-21 · **Medição:** 78ª (repo = Onda 85; ar = **Onda 84 publicada**; banco inalterado)

## 78ª medição (continuação)

- **Ar:** entry **novo** `index-DB6yClmz.js` / `index-Dv383hxY.js` — 215 chunks / 3.217.742 bytes, 0 falhas; "na nuvem. Tente novamente" = 0 → **Onda 84 publicada** (medido).

## Risco escolhido

Com hooks (81/82) e syncs (83/84) fechados, restava a última camada: **18 pontos** em rotas/componentes que faziam `toast.error(error.message)` / `toast.error(res.error.message)` — isto é, mostravam a mensagem crua do Postgres/PostgREST ao usuário, em inglês e técnica (ex.: _"new row violates row-level security policy for table "orders""_ para o vendedor ao criar pedido). Onde: `/orders` (criar pedido, cadastrar cliente), `/catalog` (status, produto, grupo e opção), `OrderDetail` (atualizar pedido, item), `/inventory` (insumo), OP (criar OP, consumo de material), modelos oficiais (excluir), `/admin/users` (conceder/remover papel), comentários (salvar/excluir/anexo), rotas produtivas (salvar).

## O que foi feito

Todos os 18 pontos passam por `descreverErroSupabase(erro, "<ação>")` com a ação em linguagem do usuário ("criar o pedido", "cadastrar o cliente", "salvar o produto", "conceder o papel"…). Mensagem desconhecida continua sendo repassada — nunca escondida. Trava: `onda85-mensagem-crua.test.ts` (2 testes: nenhum `toast.error(<erro>.message)` nos 10 arquivos; RLS de pedido vira motivo em português sem "row-level").

## Prova (Vite local + Playwright, sessão simulada)

`/route-engineering` → aba "Rotas Produtivas (PCP)" → código + nome → "Nova rota": toast **"Não foi possível salvar a rota: sua sessão expirou. Entre novamente e repita a ação."**, 0 `pageerror` (captura `auditoria/rota85-motivo.png`). Antes: mensagem crua do PostgREST.

## Gates

`tsc` 0 · `eslint` 0 erros (4 warnings pré-existentes, eram 5) · `prettier` limpo · **875/875** (873 + 2).

## Publicação

**Há uma publicação pendente (85)** — código de produto; o entry vai mudar de `index-DB6yClmz.js`. Nenhuma migration.
