# Onda 78 — Estado vazio sem papel explica em vez de sumir

**Data:** 2026-10-21
**Medição de produção:** 72ª (repo = Onda 77 publicada; ar = Onda 77; banco inalterado)

## O que foi encontrado

A auditoria de CTAs de criação (continuação do relato "telas e botões sem
ações") mediu se cada módulo tem uma saída acionável. Todos têm — **exceto**
quando o usuário não tem o papel exigido: em `/orders` e `/catalog`, o botão
de criação é gateado por papel (`canSell`/`canEdit`) e, sem o papel,
**sumia em silêncio**:

- `/orders`: estado vazio "Nenhum pedido nesta visão" sem botão "Novo pedido"
  e sem explicação (o texto "Depois é só criar o pedido…" já era ocultado
  sem o papel, mas nada dizia **por quê**).
- `/catalog`: estado vazio "Nenhum produto no catálogo" mostrava o texto
  **"Cadastre o produto…"** para quem **não pode** cadastrar — orientação
  para uma ação impossível, sem botão e sem explicação.

O padrão correto já existia no app: `admin.users` mostra "Sem permissão de
administrador. Solicite a um admin que conceda o papel **admin** ao seu
usuário." e `planner` mostra "Você está em modo leitura: só PCP, gestor e
admin alteram a programação." Os dois módulos acima não seguiam o padrão.

## O que foi corrigido

- `/orders`: sem o papel de comercial, o estado vazio mostra
  `orders-sem-permissao` — "Você não tem o papel de **comercial** para criar
  pedidos. Solicite a um gestor ou admin."
- `/catalog`: sem permissão de edição, o estado vazio mostra
  `catalog-sem-permissao` — "Você não tem permissão para cadastrar
  produtos. Solicite a um gestor ou admin." (e o texto "Cadastre o produto…"
  só aparece para quem pode).

Com o papel, o botão continua exatamente como antes. Nenhuma asserção antiga
relaxada.

## Prova executada (local, Vite + Playwright)

| Tela                       | Antes                                                   | Depois                                |
| -------------------------- | ------------------------------------------------------- | ------------------------------------- |
| `/orders` (sem papel)      | "Nenhum pedido nesta visão." sem botão e sem explicação | aviso `orders-sem-permissao` visível  |
| `/catalog` (sem permissão) | "Cadastre o produto…" sem botão e sem explicação        | aviso `catalog-sem-permissao` visível |

0 `pageerror`. Capturas `medicao72-{orders,catalog}-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **857/857** (854 + 3 do
teste `onda78-sem-permissao.test.ts`).

## Publicação

**Há uma publicação pendente (78).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição
permanece com SHA-256 `382f0f19…`.
