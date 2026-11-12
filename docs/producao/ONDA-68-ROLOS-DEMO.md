# Onda 68 — rolos de demonstração fora do laudo e do saldo

**Medição:** 62ª. **Repo:** `221ebd5` (Onda 67) local = remoto, limpo, token
0/0. **Ar:** entry novo `index-CLjgwWOV.js` / `index-ycw9M82U.js` (**214
chunks / 3.206.878 bytes**, 0 falhas) com marcadores da 67 = 1/1/1
(`commercial-carteira-vazia`, `financial-fluxo-vazio`, "Carteira B2B
vazia"), marcador da 66 = 1, da 65 = 1 e **`DEV000006` 18 → 16** —
**publicação da Onda 67 relatada pelo dono e validada por cliques em
produção** (`/commercial` com a carteira vazia, `/financial` com o fluxo
vazio, 0 `pageerror`; capturas `/home/user/medicao62-prod-commercial.png`
e `/home/user/medicao62-prod-financial.png`). **Banco:** view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

## Risco medido

A varredura dos seeds restantes mediu os `INITIAL_*` em stores (todos já
`demo: true` — GTM, outsourcing, governança, private-label) e o
`SEED_ROLLS` do painel de rolos de tecido (`FabricRollsShadePanel`, em
`/inventory`). O seed de 4 rolos (`RL-2601`…`RL-2604`, partidas `PT-8841`,
`PT-8910`, `PT-7720`, nuances, ΔE CMC, pesos e metragens) era estoque de
demonstração **sem nenhuma declaração** — e pior: a seleção inicial vinha
com `rl-1`/`rl-2` marcados, então o laudo espectrofotométrico de
homogeneidade e o saldo de **52,2 kg** já nasciam calculados sobre a
vitrine. O botão "Vincular Saldo à BOM" gravava esse saldo fictício na
ficha salva (`updateBomItem` com `estoqueDisponivel`) — dado de vitrine
apurado como estoque real. Prova antes: `RL-2601`/`PT-8841` visíveis, 0
menções a demonstração.

Contrapontos medidos: `DEFAULT_FACTORY_SECTORS` (capacidade instalada é
configuração, não dado apurado; `podeEmitirCrp` barra a emissão sem OP);
`CollectionROI` (estimativa já declarada no painel e `—` sem lote real);
`DEFAULT_PRE_COST`/`DEFAULT_DIVISOR_PARAMS`/`DEFAULT_SIZE_WEIGHTS`
(parâmetros de cálculo, não estoque).

## Correção

Mesmo contrato das coleções `demo: true` (Onda 51) e dos creators (Onda 59):

- O seed marca `demo: true` (`FabricRollItem.demo?`); a seleção inicial
  nasce vazia; o laudo e o saldo só consideram rolos reais (`!r.demo`).
- A tabela mostra o aviso `fabric-rolls-demo` ("Rolos de demonstração na
  tabela… O PLM não é ERP: nenhum saldo de vitrine é apurado como real").
- Os rolos de demonstração continuam ilustrando a tabela; só rolo
  registrado pelo usuário entra no laudo e no saldo vinculado à BOM.

Nenhuma asserção antiga relaxada.

## Prova por cliques (depois)

`/inventory`: aviso `fabric-rolls-demo` renderizado; `RL-2601` continua
ilustrando a tabela; laudo com "Selecione rolos para validar
homogeneidade"; saldo de 52,2 kg da vitrine ausente; 0 `pageerror`.
Captura `/home/user/medicao62-inventory-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **818/818**
(814 + 4 do teste novo `onda68-rolos-demo.test.ts`).

## Publicação

**Há uma publicação pendente (68).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.
