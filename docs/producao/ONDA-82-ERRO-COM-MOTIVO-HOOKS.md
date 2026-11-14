# Onda 82 — Todas as gravações Supabase dos hooks explicam o porquê

**Data:** 2026-10-21 · **Medição:** 76ª (repo = Onda 82; ar = **Onda 81 publicada e validada**; banco inalterado)

## 76ª medição ("publicado")

- **Ar:** entry **novo** `index-CD4lF0IV.js` / `index-VnNIuK1b.js` — 215 chunks / 3.216.846 bytes, 0 falhas; "sua sessão expirou" = 1, "Falha ao criar referência" = 0 (marcadores da 81).
- **Clique em produção** (`/references` → Nova referência → Criar): toast **"Não foi possível criar a referência: sua sessão expirou. Entre novamente e repita a ação."**, diálogo aberto, 0 `pageerror`. Captura `medicao76-prod-references.png`.
- **Banco:** view `200 []`, 4 funções `401 42501` (com os parâmetros corretos — `{}` dá `404` por assinatura, não é regressão), SHA `382f0f19…`.

## Risco escolhido

Varredura `if (error) return null/false` nos hooks: **6 gravações** ainda engoliam o erro — CAPA mover/salvar (`use-capa`), piloto (`use-pilotos`), peça-mãe e feedback (`use-showroom`), upsert de referência (`use-references`) — e `remove` do CAPA ignorava o erro por completo. **Achado real:** no `CapaDrawer`, qualquer falha de banco (ex.: permissão) era exibida como **"Transição não permitida"** — regra de negócio no lugar do motivo real.

## O que foi feito

- Cada gravação emite um toast único com `descreverErroSupabase(error, "<ação>")` ("mover o CAPA", "salvar o CAPA", "excluir o CAPA", "criar o piloto", "solicitar a peça-mãe", "registrar o feedback", "salvar a referência").
- Regra de negócio do CAPA separada: `Transição não permitida: <de> → <para>.` só quando `canTransition` é falso.
- Chamadores (`CapaDrawer`, `/showroom`) deixam de sobrepor toast genérico.
- Trava: `onda82-erro-com-motivo-hooks.test.ts` (3 testes: nenhum `if (error) return null/false` nos 4 hooks; CAPA com mensagens distintas; showroom sem genérico).

## Prova

Local: `/showroom` e `/quality` carregam com 0 `pageerror`. **Limitação honesta:** CAPA, piloto e showroom exigem registro Supabase existente (lista vazia na sessão simulada — botões desabilitados), então o clique de falha não é reproduzível sem usuário real; o caminho é o mesmo da 81, provado em produção na 76ª.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **867/867** (864 + 3).

## Publicação

**Há uma publicação pendente (82)** — código de produto, o hash do entry vai mudar. Nenhuma migration.
