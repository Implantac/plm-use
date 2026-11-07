# Onda 39 — Pedido de papel não é carteira

**Data:** 06/11/2026 · **Commit:** `7526080` · **Antecessor:** `0228013` (Onda 38 + docs)

---

## 1. O ar avançou mais uma vez, sem aviso

Medindo o ambiente no fim da rodada, o entry já era **`index-BcTzKh6M.js`**
(221 chunks), com `gtm-so-vitrine` **1 vez**, `sop-sem-drops` **1 vez** e
`não entra em número operacional` **1 vez**: a **Onda 38 foi publicada**.
`sop-sem-pedidos` = **0** — a Onda 39 ainda não está no ar. `DEV000006` caiu de
29 para **27** ocorrências.

| Camada        | 15ª medição                   | **16ª medição**                                      |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Repositório   | Onda 38                       | **Onda 39** (este commit)                            |
| App publicado | Onda 37 (`index-DYB6k9Kp.js`) | **Onda 38** (`index-BcTzKh6M.js`)                    |
| Banco         | sem migrações 21/24           | **sem migrações 21/24** — `PGRST205` + 3× `PGRST202` |

O banco não muda desde a 4ª medição. Publicar app não aplica SQL.

---

## 2. O gerador que restava

A Onda 38 tirou as campanhas GTM de fábrica dos números. Faltava o mesmo para
**pedidos**. Medição executada antes da correção:

```
INITIAL_PRIVATE_LABEL_ORDERS = 2 pedidos
  PD-2026-801 · CNPJ 14.890.300/0001-22 · R$ 69,90 · "Arena Esportes & Running Club"
  PD-2026-802 · R$ 89,50

computeLiveSopSnapshot({ orders: INITIAL_PRIVATE_LABEL_ORDERS, ... })
→ { receita: 9867.20, margem: 50.79%, pecas: 112 }

runDeterministicAgentAnalysis({ agent: "engenharia", ... })
→ "• Alerta Crítico de Margem (1 pedido(s)): PD-2026-801 ...
    margem real de 11.8% (meta 32%) ... preço mínimo recomendado: R$ 90.62"
```

Ou seja: **R$ 9.867,20 de "Carteira B2B Ativa"**, 112 peças e uma recomendação
de preço em reais impressas no Book Executivo S&OP A4, no painel de Analytics,
no MRP, na capacidade finita e no copiloto — tudo derivado de CNPJ, materiais e
nomes de pessoas inventados. Pior: com `sheets: {}` o copiloto dizia _"Todos os
pedidos da Fila Private Label atingem a meta mínima de margem industrial"_,
uma afirmação **falsa** quando não há pedido nenhum.

---

## 3. O que mudou

### `private-label-queue.ts`

`PrivateLabelOrder` ganhou `demo?: boolean`; os dois pedidos de fábrica foram
marcados (e **não apagados** — continuam na Fila de Custos com selo
"Demonstração"). Entraram `PEDIDO_DEMO_LABEL`, `pedidosOperacionais(orders)` e
`promover(o)`.

**Qualquer edição humana promove o pedido a carteira real**: `cloneOrder`,
`updateOrderPricing`, `updateOperationFields`, `setNominalRosterAndSyncGrade` e
`setOrderStatus` removem `demo`. Sem isso, um pedido editado continuaria
invisível para os números — o mesmo descuido que a Onda 38 deixou implícito no
`upsertCampaign`.

### Filtro nos motores (defesa em profundidade)

| Motor                                          | Antes                                | Agora                                                                        |
| ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| `computeLiveSopSnapshot`                       | soma `params.orders`                 | `pedidosOperacionais(...)` na carteira **e** no cálculo de capacidade finita |
| `computeMrpNetExplosion`                       | explode BOM dos pedidos de papel     | filtra; vitrine não gera necessidade de compra                               |
| `runDeterministicAgentAnalysis`                | alerta de margem sobre `PD-2026-801` | filtra; sem pedidos → _"margem industrial não apurável"_                     |
| `FiniteCapacityPanel` / `MrpNetExplosionPanel` | planejavam 112 peças de papel        | só pedidos operacionais                                                      |

`LiveSopSnapshot` ganhou `apuravelB2b` e `apuravelGtm`. O **Book Executivo A4**
agora imprime `—` e um aviso âmbar quando não há carteira/Drop próprios, em vez
de `R$ 0,00` ou `0.0%` com cara de apuração. `LiveSopBoard` faz o mesmo nos
KPIs (`sop-sem-pedidos`), e `ai-agents.tsx` no card "Fila Custos".

### Fixtures, não afrouxamento

`src/test/pedidos-salvos.ts` devolve os dois pedidos com `demo: false`. Os cinco
arquivos de teste que usavam `INITIAL_PRIVATE_LABEL_ORDERS` foram **migrados**
(`deterministic-copilot`, `live-sop`, `mrp-explosion`, `private-label-queue`,
`onda38-vitrine`) e mantêm todas as asserções originais: `> 9000`, `> 40%`,
`112 peças`, `setup > 20`, `marginHealthy === false`, `"PD-2026-801"`,
`"Alerta Crítico de Margem"`. Nenhuma foi removida ou relaxada.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **550/550** (eram 538)             |

**12 testes novos** (`onda39-pedidos.test.ts`): os 2 pedidos marcados com CNPJ
e preços de papel; `pedidosOperacionais` e mistura; S&OP zerado com
`apuravelB2b: false`; A4 com `—` e sem `"9.867,20"`/`"112 peças"`/`"R$ 0,00"`;
MRP sem necessidade de compra; copiloto sem `"PD-2026-801"`, sem alerta de
margem, sem `"90.62"` e sem a frase falsa "todos atingem a meta"; com
`pedidosSalvos()` os números e o alerta reaparecem; os 5 updaters promovem a
vitrine a carteira real; e guardas de fonte nos 7 consumidores.

---

## 5. Estado e o que resta

Repo **Onda 39**, ar **Onda 38** (uma onda atrás), banco **sem as migrações
21/24**. A Onda 39 só vale para o operador depois de publicar.

Resíduos medidos:

1. **`ensure()`** — template explícito no store, sem chamadores em produção
   desde a Onda 35, mas ainda cria o modelo inteiro e marca `materializadas`.
   É a última ação capaz de plantar engenharia de papel; removê-la exige
   reescrever ~15 testes que exercitam essa defesa em profundidade.
2. **`INITIAL_BRIEFINGS`** — 3 briefings de fábrica com `targetPriceBrl 259.9`
   e `confidencePct 89`; a Onda 35 já impede que virem ficha com custos do
   modelo, mas continuam sendo vitrine com números.
3. **Outras vitrines `INITIAL_*`** — lotes de PCP, OS de facção, influencers.
   `DEV000006` ainda aparece **27 vezes** no ar.
4. **Banco** (`APLICAR-ONDA-21-24.sql`, 3 NOTICEs) e **credencial de e2e**
   seguem com o dono.
