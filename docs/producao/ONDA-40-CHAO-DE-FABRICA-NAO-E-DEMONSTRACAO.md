# Onda 40 — Chão de fábrica não é demonstração

**Data:** 06/11/2026 · **Antecessor:** `b8b07f2` (Onda 39 + docs)

---

## 1. O ar parou — e a distância voltou a crescer

A 17ª medição encontrou o **mesmo** entry da 16ª: **`index-BcTzKh6M.js`**, 221
chunks, `gtm-so-vitrine` 1 vez e **`sop-sem-pedidos` 0**. Ao contrário das três
rodadas anteriores, **não houve publicação**: a Onda 39 não chegou ao ar.

| Camada        | 16ª medição                   | **17ª medição**                                      |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Repositório   | Onda 39                       | **Onda 40** (este commit)                            |
| App publicado | Onda 38 (`index-BcTzKh6M.js`) | **Onda 38**, sem alteração                           |
| Banco         | sem migrações 21/24           | **sem migrações 21/24** — `PGRST205` + 3× `PGRST202` |

O repo está agora **duas ondas** à frente do ar (39 e 40). `sop-sem-faccao`,
`apuravelFaccao`, `servicosOperacionais` e `lotesOperacionais` = **0** no bundle.
`DEV000006` segue em **27** ocorrências. O banco não muda desde a 4ª medição.

---

## 2. As duas últimas vitrines que ainda viravam número

As Ondas 38 e 39 tiraram campanhas GTM e pedidos dos números operacionais.
Restavam as vitrines de **chão de fábrica**. Medição executada antes da correção:

```
INITIAL_SERVICE_ORDERS = 3 OS de fábrica (OS-2026-041 … 043)
computeLiveSopSnapshot({ orders: [], campaigns: [], serviceOrders: INITIAL... })
→ outsourcedPiecesInFlight = 656
→ Book Executivo S&OP A4: "Costura Interna / Em Facção: 0% · 656 pçs"

usePCPStore.getState().lotes = 4 lotes de fábrica (LOTE 2601 …)
runDeterministicAgentAnalysis({ agent: "pcp", lotesSummary: ... })
→ "🏭 Diagnóstico PCP ... (4 lotes monitorados · 0 peças pendentes)"
→ "• Nenhuma fila crítica pendente nos lotes atuais."   ← falsa sem nenhum lote
```

Eram **656 peças de produção inventadas** no documento da diretoria e uma
afirmação de que a fila estava saudável quando não havia fila nenhuma.

---

## 3. O que mudou

### `outsourcing-os.ts`

`ExternalServiceOrder` ganhou `demo?: boolean`; as 3 OS de fábrica foram
marcadas (e **não apagadas**). Entraram `SERVICO_DEMO_LABEL`,
`servicosOperacionais()` e `promoverOS()`. `addServiceOrder` e
`updateOrderReturns` promovem a OS a produção real — mesma regra das Ondas
38/39: qualquer edição humana tira o selo de vitrine.

### `src/types/pcp.ts` + `src/lib/pcp/store.ts`

`Lote` ganhou `demo?: boolean`; os 4 lotes do `seed` foram marcados. Entraram
`lotesOperacionais()` e `promoverLotes()`, aplicados nos dois updaters que
registram passagem/ocorrência. Um lote criado pelo usuário nasce sem `demo`.

### Motores e telas

| Consumidor                            | Antes                                          | Agora                                                        |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `computeLiveSopSnapshot`              | 656 peças "em voo"                             | filtra OS; `apuravelFaccao` no snapshot                      |
| `buildExecutiveSopReportHtml`         | `0% · 656 pçs`                                 | `—` + aviso âmbar quando não apurável                        |
| `LiveSopBoard`                        | KPI de facção com número de papel              | `—` + `sop-sem-faccao`                                       |
| `runDeterministicAgentAnalysis` (PCP) | "4 lotes monitorados" / "Nenhuma fila crítica" | "sem lotes salvos · balanceamento não apurável" + explicação |
| `ai-agents.tsx`                       | repassava os 4 lotes de fábrica                | `lotesOperacionais(...)`                                     |

### Fixtures, não afrouxamento

`src/test/chao-de-fabrica-salvo.ts` fornece `servicosSalvos()` e
`lotesSalvos()`. O teste da Onda 39 que exigia o A4 sem aviso foi **migrado**
para `servicosSalvos()` — e continua exigindo `"656 pçs"`, `> 9000`, `> 40%`,
`112 peças` e a ausência de "não apurável". Nenhuma asserção antiga foi
removida ou relaxada.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **562/562** (eram 550)             |

**12 testes novos** (`onda40-chao-de-fabrica.test.ts`): as 3 OS e os 4 lotes
marcados; `servicosOperacionais`/`lotesOperacionais` e mistura; S&OP zerado com
`apuravelFaccao: false`; A4 sem `"656 pçs"` e com `—`; copiloto PCP sem
`"4 lotes monitorados"` e sem a frase falsa; com `servicosSalvos()` e
`lotesSalvos()` os números reaparecem; os 3 updaters promovem a vitrine; e
guardas de fonte nos consumidores.

---

## 5. Estado e o que resta

Repo **Onda 40**, ar **Onda 38** (**duas ondas** atrás: 39 e 40), banco **sem as
migrações 21/24**. Enquanto não republicar, o Book Executivo S&OP no ar ainda
imprime 656 peças de facção e R$ 9.867,20 de carteira B2B de papel.

Resíduos medidos:

1. **`ensure()`** — última ação capaz de plantar engenharia de papel. Sem
   chamadores em produção desde a Onda 35, mas ainda cria o modelo inteiro e
   marca `materializadas`; ~15 testes exercitam essa defesa em profundidade.
2. **`INITIAL_BRIEFINGS`** (4, com `targetPriceBrl 229.9/259.9` e
   `confidencePct 95/89`), **`INITIAL_PARTNERS`** (4) e
   **`INITIAL_GOVERNANCE_EVENTS`** — vitrines declaradas que **não** entram em
   número consolidado; a Onda 35 já impede que um briefing vire ficha com
   custos do modelo.
3. **`DEV000006` 27× no ar** — `photorealism`, placeholders de primeiro frame.
4. **Banco** (`APLICAR-ONDA-21-24.sql`, 3 NOTICEs), **publicar 39+40** e
   **credencial de e2e** seguem com o dono.
