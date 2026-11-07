# Onda 38 — A vitrine não entra no número

**Data:** 06/11/2026 · **Commit:** `903727c` · **Antecessor:** `87baa2e` (Onda 37 + docs)

---

## 1. O ar avançou de novo, sem aviso

Ao medir o ambiente no fim desta onda, o entry já não era o da 14ª medição:
saiu `index-DDU6Ug_A.js` e entrou **`index-DYB6k9Kp.js`** (221 chunks), com
`reserva-migracao-pendente` **1 vez**. Extraí o contexto para não confundir
"string presente" com "promessa ativa":

```js
// _authenticated.inventory-CahgXpKs.js
u === "verificando" && ... "Verificando se o ciclo automático da reserva está aplicado neste banco…"
u === "ativa"       && ... "Consumo e liberação são automáticos: ..."
```

A frase ainda existe no bundle, mas agora **dentro do ramo `ativa`**. A **Onda
37 foi publicada** — o dono não precisou anunciar, a medição achou. Como o banco
continua sem as migrações, o card de reservas no ar mostra o aviso âmbar
`pendente`, que é exatamente o comportamento correto.

| Camada        | 14ª medição                   | **15ª medição**                                      |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Repositório   | Onda 37                       | **Onda 38** (este commit)                            |
| App publicado | Onda 36 (`index-DDU6Ug_A.js`) | **Onda 37** (`index-DYB6k9Kp.js`)                    |
| Banco         | sem migrações 21/24           | **sem migrações 21/24** — `PGRST205` + 3× `PGRST202` |

`gtm-so-vitrine` e `sop-sem-drops` = **0** no ar: a Onda 38 ainda não foi
publicada. `DEV000006` continua aparecendo **29 vezes** no bundle.

---

## 2. Os dois geradores de papel que ainda estavam vivos

Medição executada antes da correção:

```
runDeterministicAgentAnalysis({ sheets: { V24-001: seedFor(...), DEV000006: seedFor(...) },
                               drops: INITIAL_GTM_CAMPAIGNS, agent: "engenharia" })
→ "📐 Diagnóstico Engenharia & Custos Industriais
   (2 fichas ativas · SAM médio 13.5 min/peça)"

agent: "fashion"
→ "✨ ... (2 referências técnicas mapeadas: V24-001 (Produto Engenharia V24-001),
   DEV000006 (Camiseta Esportiva Dry Pro))"

sheets: {}  →  "0 fichas ativas · SAM médio 0.0 min/peça"   ← zero com cara de apuração
```

A rota `_authenticated.ai-agents.tsx` montava duas fichas `seedFor()` quando o
store estava vazio. A tela **declarava** a origem (`origemAnalise = "referencia"`,
badge âmbar, avisos), mas o card dizia **"Fichas Lidas: 2 · BOM + SAM"** e o
copiloto devolvia SAM e nomes de produto do modelo. Não era silencioso — era
**um número operacional calculado sobre demonstração**.

O segundo gerador era dinheiro: `INITIAL_GTM_CAMPAIGNS` tem **3 campanhas** com
`attributedSalesBrl: 218_400`, `mediaSpendBrl: 42_000` e `productionCostBrl:
18_500`. Alimentavam `computeGtmPortfolioSummary`, a tela de Marketing, o **Book
Executivo S&OP A4** (`LiveSopBoard`) e o ROAS do copiloto.

---

## 3. O que mudou

### `research-gtm.ts`

`GtmDropCampaign` ganhou `demo?: boolean`. As três campanhas de fábrica foram
marcadas `demo: true` (**não foram apagadas** — continuam visíveis como
vitrine, agora com selo "Demonstração"). Entraram `GTM_DEMO_LABEL` e
`campanhasOperacionais(campaigns)`. `computeGtmPortfolioSummary` **filtra
internamente**, protegendo de uma vez todos os chamadores: Marketing,
Live S&OP A4 e copiloto.

### `deterministic-copilot.ts`

Filtra `input.drops` dentro da própria função (defesa em profundidade) e troca
os zeros de papel por ausência declarada:

| Agente     | Antes (sem dados)                                | Agora                                                  |
| ---------- | ------------------------------------------------ | ------------------------------------------------------ |
| Engenharia | `0 fichas ativas · SAM médio 0.0 min/peça`       | `sem ficha salva · SAM médio —`                        |
| Criação    | `0 referências técnicas mapeadas: catálogo base` | `sem ficha salva · nenhuma referência técnica mapeada` |
| Marketing  | `0 drops monitorados` + ROAS de demo             | `sem drops salvos · ROAS não apurável`                 |

### `ai-agents.tsx`

`seedFor()` saiu. `sheets` agora é `Object.fromEntries(operationalCodes(rawSheets,
[], materializadas))` — só o que a empresa salvou. `drops` passa por
`campanhasOperacionais`. Cards "Fichas Lidas" e "Drops GTM" mostram **`—`**
quando não há dado próprio, e o `subtitle` para de dizer "conectados aos dados
reais" no modo demonstração.

### Telas de dinheiro

`marketing.tsx`: os quatro KPIs viram `—` quando só há vitrine, com aviso
`gtm-so-vitrine` e selo "Demonstração" em cada card. `LiveSopBoard.tsx`:
"Receita Drops GTM" e "ROAS Blended Real" viram `—`, com `sop-sem-drops`
explicando que a vitrine não entra no Book Executivo S&OP.

### Fixtures, não afrouxamento

`src/test/campanhas-salvas.ts` devolve as três campanhas com `demo: false` —
"portfólio salvo pela empresa". Os testes antigos de `research-gtm`,
`live-sop` e `deterministic-copilot` foram **migrados para essa fixture** e
mantêm todas as asserções originais: `totalCampaigns === 3`, `ROAS > 4`,
`ROAS > 4.5`, `"Drop 02"`, `"5.62x"`. Nenhuma foi removida ou relaxada.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **538/538** (eram 526)             |

**12 testes novos** (`onda38-vitrine.test.ts`): as 3 campanhas marcadas e com
R$ 218.400 de papel; resumo do portfólio zerado para a vitrine; portfólio salvo
continua apurando; mistura filtra só as não-demo; S&OP A4 sem ROAS/receita de
papel; os três agentes declarando ausência sem `0.0`, sem `catálogo base`, sem
`DEV000006`, sem `Drop 02`; com ficha e Drop salvos a apuração continua real; e
três guardas de fonte (rota sem `seedFor(`, copiloto sem `"0.0"`, telas
declarando a vitrine).

---

## 5. Estado e o que resta

Repo **Onda 38**, ar **Onda 37** (uma onda atrás), banco **sem as migrações
21/24**. A Onda 38 só vale para o operador depois de publicar; aplicar
`APLICAR-ONDA-21-24.sql` continua sendo a ação que destrava o ciclo automático.

Resíduos medidos para as próximas ondas:

1. **`ensure()`** continua no store como template explícito — sem chamadores em
   produção desde a Onda 35, guardado por teste, mas ainda cria o modelo
   inteiro e marca `materializadas`. Removê-lo exigiria reescrever ~15 testes
   que exercitam essa defesa em profundidade; decidir com calma.
2. **`INITIAL_BRIEFINGS` e `INITIAL_PRIVATE_LABEL_ORDERS`** também são vitrines
   com números de dinheiro que alimentam o copiloto e o S&OP. Foram **medidos**,
   não corrigidos nesta onda.
3. **`DEV000006` 29× no ar** — `photorealism`, placeholders de primeiro frame e
   referências de exemplo seguem visíveis.
4. **Banco e credencial de e2e** seguem com o dono.
