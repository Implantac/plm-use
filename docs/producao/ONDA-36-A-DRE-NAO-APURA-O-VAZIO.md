# Onda 36 — A DRE não apura o vazio

**Data:** 05/11/2026 · **Commit:** `1694e3d` · **Antecessor:** `bbc2b2e` (Onda 35 + docs)

---

## 1. O resíduo da Onda 35 era pior do que parecia

A Onda 35 fechou com um registro honesto: _"`computeCollectionDreSummary`
ainda marca `apuravel: true` com EBITDA 0 para ficha vazia — o zero é honesto,
mas falta aviso na tela"_. Aquela medição, porém, foi feita passando
`fixedOverheadBrl = 0`. **Com o overhead fixo padrão da tela (R$ 85.000)**, a
medição real foi outra:

```
computeCollectionDreSummary({ "NOVA-001": blankFor("NOVA-001") })
→ { apuravel: true, ebitdaBrl: -85000, grossRevenue: 0,
    totalPieces: 50, skus: 1, fixedOverheadBrl: 85000 }

buildDrePrintableHtml(dre)
→ contém "- R$ 85.000,00" e NÃO contém "não apurável"
```

Ou seja: **um único clique em "criar ficha" gerava um prejuízo de R$ 85.000
impresso no A4, sem nenhum aviso** — exatamente o "prejuízo inventado a partir
do vazio" que a Onda 30 tinha eliminado. A Onda 35 reintroduziu o caminho ao
fazer `blankFor()` criar fichas com `provenance: "salva"`.

A causa tinha três partes:

1. `const apuravel = keys.length > 0` (Onda 30) — presença de ficha bastava;
2. `const tiragem = Math.max(50, doc.preCost.tiragemPlanejada ?? 600)` — com
   tiragem `0`, inventava **50 peças**; com ausência, inventava **600**;
3. o A4 imprimia `- ${fmt(dre.fixedOverheadBrl)}` **fora** do helper `v()` que
   troca números por `—` quando não apurável.

---

## 2. O que mudou

### `pendenciasEngenhariaDre(doc)`

Nova função pura, no mesmo padrão de `dppRequirements` (Onda 33):

| Pendência          | Exigência                                                     |
| ------------------ | ------------------------------------------------------------- |
| `sem-bom-custeada` | `pricing.bom > 0` — **BOM custeada**, não aplicações isoladas |
| `sem-preco`        | `precoReferenciaMargem` ou `precoSugerido` > 0                |
| `sem-tiragem`      | `preCost.tiragemPlanejada` declarada e > 0                    |

Descoberta durante os testes: a primeira versão somava
`pricing.bom + pricing.aplicacoesPeca`, e uma ficha com `bom: []` **passava**
por causa das aplicações/aviamentos de R$ 2,30/peça. A exigência agora é
estritamente BOM custeada — aplicação sem BOM não é engenharia.

### `computeCollectionDreSummary`

`keys` é separado em **`apuraveis`** e **`semEngenharia`**. Só os apuráveis
entram em `skus` e nos acumuladores:

```ts
const apuravel = apuraveis.length > 0;
const tiragem = Number(doc.preCost.tiragemPlanejada ?? 0); // sem piso, sem 600
```

`ebitdaBrl` continua `0` quando não apurável — overhead fixo não vira prejuízo.
`origem` ganhou `semEngenharia: string[]` e `salvas` passou a listar **apenas as
apuradas**. `referencias` segue declarando os SKUs do modelo que ficaram de fora
(Onda 30).

### A4 e telas

`buildDrePrintableHtml` agora tem três estados de aviso: sem ficha salva, com
fichas salvas **mas sem engenharia custeada**, e com mistura (apuradas +
excluídas, nomeando cada uma). As linhas negativas passaram por `neg(n)`, que
só prefixa `- ` quando apurável — antes o A4 não apurável mostrava `- —`.

`financial.tsx` trocou "Nenhuma ficha técnica salva" pelo motivo real quando há
`semEngenharia`, e o `change` do card de receita diz "sem engenharia custeada".
`dashboard.tsx` passou a usar `dre.apuravel` diretamente, mostra a contagem de
fichas sem engenharia e as declara no rodapé do EBITDA e do volume planejado.

---

## 3. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **522/522** (eram 511)             |

**11 testes novos** (`onda36-dre.test.ts`): as três pendências de `blankFor`;
DRE de ficha vazia não apurável com `ebitdaBrl: 0`, `totalPieces: 0`,
`skus: []` e `origem.semEngenharia`; **A4 sem "85.000,00" e sem "-R$"**; ficha
com engenharia declarada apurável com `totalPieces === tiragem`; mistura apura
só uma e declara a outra no A4; ficha sem tiragem fica de fora (morreu o
`?? 600`); ficha sem BOM fica de fora; tiragem de **1 peça** é respeitada
(morreu o piso de 50); e três guardas de fonte.

O teste de caracterização da Onda 35 foi **endurecido**, não removido: onde
documentava `apuravel: true` / `skus: 1`, agora exige `apuravel: false`,
`skus: []` e a ref em `origem.semEngenharia`. Os 12 testes da Onda 30 seguem
intactos — nenhuma asserção antiga foi afrouxada.

---

## 4. Medição das três camadas (13ª, 05/11)

| Camada        | Estado                     | Evidência                                                                                                                                                                |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repositório   | **Onda 36** (este commit)  | `git ls-remote`                                                                                                                                                          |
| App publicado | **Onda 29**, sem alteração | mesmo entry `index-1d8-RbIh.js`, 218 chunks; `Poliéster` **11×**, `Malha Dry Fit` **8×**; `DRE não apurável`, `Fichas sem engenharia`, `Risco CAD não declarado` = **0** |
| Banco         | **sem as migrações 21/24** | `PGRST205` na view, 3× `PGRST202` nas RPCs                                                                                                                               |

O ar está **sete ondas** atrás do repo (30–36). O banco não muda desde a 4ª
medição. Publicar app não aplica SQL; a UI no ar ainda promete automação de
reserva que o banco não tem.

---

## 5. O que resta

1. **`ensure()` como template** — sem chamadores em produção desde a Onda 35,
   mas ainda cria o modelo inteiro; decidir se a ação sai de vez ou fica só
   para migração v0→v2 e selos de procedência.
2. **Vitrines declaradas** — `ai-agents.tsx` monta `{ V24-001: seedFor(),
DEV000006: seedFor() }`, `INITIAL_GTM_CAMPAIGNS`, `photorealism`, placeholder
   de primeiro frame do cockpit.
3. **Banco** — `APLICAR-ONDA-21-24.sql` esperando o SQL editor de
   `njmniwsqwohmigroswnl`.
4. **Publicar** as Ondas 30–36 no Lovable.
