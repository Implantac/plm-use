# Onda 35 — Criar uma ficha não é copiar o modelo

**Data:** 05/11/2026 · **Commit:** `c145545` · **Antecessor:** `65be399` (Onda 34 + docs)

---

## 1. Medição que escolheu esta onda

A Onda 34 registrou como próximo risco: _"medir se algum emissor consome
BOM/custos do seed sem passar pelo gate de materialização"_. Em vez de só ler o
código, **executei** a conversão de briefing e imprimi o documento criado:

```
BRIEFING ref CR27-101 · provenance "salva"
bom: [
  "Malha Tricot Linho & Algodão 195 g/m² | 195 | 39.8",   ← tecido do briefing
  "Ribana Gola V Listrada Poliéster      | 210 | 48.5",   ← DEV000006
  "Linha Poliéster Texturizada 120       |   — | 0.008",  ← DEV000006
  "Etiqueta CNPJ Transfer + Tag + Polybag|   — | 1.95",  ← DEV000006
]
bop: 4 · colorways: 3 · preCost: { targetCusto: 34, markupPct: 185,
  tiragemPlanejada: 200, targetPreco: 229.9 } · ncm: "" · encaixeCad: ausente
```

O **"Briefing Criativo → Engenharia (1 clique)"** chamava `ts.ensure(refCode)`,
que plantava o `seedFor()` inteiro, e depois `updateMeta()`. Como qualquer
edição tira a ref do mapa `materializadas`, a ficha virava **`provenance:
"salva"`** — e entrava na DRE, no pré-custo, no MRP e no catálogo com BOM,
operações, variantes e custos do produto de demonstração.

A raiz era mais larga: **20 updaters** do `store.ts` usavam
`s.data[ref] ?? seedFor(ref)`. Ou seja, _qualquer_ `updateMeta` numa ref
inexistente fabricava o modelo. E `ensure()` ainda era chamado em **6 painéis
internos** (dentro do seletor do Zustand — efeito colateral na leitura), no
cockpit (placeholder `seedFor` + `useEffect` que gravava), em estampas, portal
do fornecedor, aprovações e na esteira de desenvolvimento.

---

## 2. O que mudou

### `blankFor()` e `criarFicha()`

Nova função `blankFor(ref)`: documento com `bom: []`, `bop: []`,
`versoes: []`, `aplicacoes: []`, `colorways: []`, `medidas.pontos: []`,
`preCost` zerado, etiqueta em branco e **sem encaixe CAD**. Nova ação
`criarFicha(ref, meta?)` grava esse documento, marca `dirty` e **não** entra no
mapa `materializadas` — é trabalho do usuário, não template.

Os **20 fallbacks `?? seedFor(ref)`** dos updaters viraram `?? blankFor(ref)`.
Agora editar uma ficha que não existe cria um documento vazio, nunca o modelo.

`ensure()` **continua existindo** como produtor explícito de _template_ (usado
por `isPristineSheet`, pela migração v0→v2 e pelo selo de procedência), mas
**nenhum chamador em produção resta**: grep em rotas e painéis = zero
ocorrências executáveis.

### Criação e navegação

| Antes                                                                              | Agora                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `research-gtm` · `ts.ensure(refCode)` + `updateBomItem` no item do modelo          | `criarFicha` + `addBomItem` **só com o tecido/gramatura declarados**, sem custo; 1 colorway (a do briefing), 0 BOP, pré-custo zerado com só `targetPreco` do briefing |
| `development` · `ensure(code)` / `ensure(form.cloneFrom)`                          | `criarFicha(code)`; clonar de origem sem ficha salva dá erro declarado em vez de fabricar a origem                                                                    |
| `tech-sheet` · `doc = docDoStore ?? seedFor(...)` + `useEffect(() => ensure(...))` | `doc = docDoStore ?? blankFor(...)`; nada é gravado por navegar; `switchRef` usa `criarFicha`                                                                         |
| 6 painéis internos · `s.data[ref] ?? ensure(ref)` no seletor                       | leitura pura + `blankFor(ref)`; sem `set()` durante a leitura, sem `useEffect` plantador                                                                              |
| `prints`, `supplier-portal`, `approvals` · `ensure(...)` antes de gravar           | guarda (`if (!doc) return` / toast de erro); `resolveSheet` usa `blankFor` como fallback                                                                              |

### Emissores sem variantes emprestadas

`usecloud-adapter` e `mrp.ts` faziam
`doc.colorways?.length ? doc.colorways : defaultColorwaysFor()` e
`doc.medidas ?? defaultMedidasFor()`. Ficha sem engenharia herdava **3
colorways, 5 tamanhos e os POMs com a observação "malha Dry Fit com 4%
elastano"** do modelo. Agora: sem colorways → **nenhum SKU / matriz vazia**;
sem grade → tamanhos vazios (MRP mantém apenas a grade genérica PP–GG para não
dividir por zero, sem POMs do modelo). O cockpit também deixou de sugerir
`"Esportivo / Malharia"` e `"Verão 2027"` como textos do produto.

---

## 3. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **511/511** (eram 495)             |

**16 testes novos** (`onda35-criacao.test.ts`), com o store zerado entre casos:
`blankFor` sem nenhum dado do modelo; `criarFicha` idempotente, `dirty: true` e
`provenance: "salva"`; updater sem ficha não planta BOM; `ensure()` segue
sendo template marcado; briefing cria **1 item de BOM / 0 BOP / 1 colorway /
pré-custo zerado** e o JSON não contém `Ribana`, `Linha Poliéster`, `Malha Dry
Fit`, `DEV000006`, `markupPct:185` nem `targetCusto:34`; explosão de SKUs e MRP
de ficha vazia devolvem listas vazias; plano de corte segue não apurável; e 5
guardas de fonte contra `?? seedFor(`, `ensure(` em rotas/painéis,
`defaultColorwaysFor(`/`defaultMedidasFor(` nos emissores e `seedFor(` no
cockpit.

Nenhum teste antigo foi afrouxado — a suíte passou de 495 para 511 sem uma
única asserção removida.

**Medição depois da correção** (mesmo comando, antes/depois):

```
BRIEFING provenance "salva" · bom: ["...Linho... | 195 | sem custo"]
bop: 0 · colorways: 1 · preCost: { targetCusto: 0, markupPct: 0,
  tiragemPlanejada: 0, targetPreco: 229.9 } · ncm: "" · encaixeCad: ausente
```

### Resíduo medido, não escondido

`computeFullTechSheetPricing(blankFor(...))` devolve `precoSugerido: 0` e
`custoFinal: 0` — **sem NaN**. `computeCollectionDreSummary` com uma ficha vazia
devolve `apuravel: true`, `ebitdaBrl: 0`, `skus: 1`: é ficha salva, então a DRE
a conta, mas não inventa receita nem prejuízo. O próximo risco natural é
**sinalizar na tela que não há engenharia custeada a apurar** — hoje o zero
aparece sem essa explicação. Há teste de caracterização registrando o
comportamento.

---

## 4. Medição das três camadas (12ª, 05/11)

| Camada        | Estado                     | Evidência                                                                                                                          |
| ------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 35** (este commit)  | `git ls-remote`                                                                                                                    |
| App publicado | **Onda 29**, sem alteração | mesmo entry `index-1d8-RbIh.js`, 218 chunks; `Poliéster` **11×** e `Malha Dry Fit` **8×** no bundle; `Risco CAD não declarado` = 0 |
| Banco         | **sem as migrações 21/24** | `PGRST205` na view, 3× `PGRST202` nas RPCs                                                                                         |

O ar está **seis ondas** atrás do repo (30–35). As ocorrências de `Poliéster` e
`Malha Dry Fit` no bundle são a prova de que a BOM e a etiqueta do modelo
continuam sendo servidas em produção. Banco inalterado desde a 4ª medição.
Publicar app não aplica SQL.

---

## 5. O que resta

1. **DRE de ficha sem engenharia** — `apuravel: true` com EBITDA 0; falta o
   aviso declarado na tela/A4 (medido acima).
2. **`ensure()` como template** — sem chamadores em produção, mas ainda cria o
   modelo inteiro; decidir se a ação sai de vez ou fica só para migração/selos.
3. **Vitrines declaradas** — `ai-agents.tsx` ainda monta `{ V24-001: seedFor(),
DEV000006: seedFor() }`, `INITIAL_GTM_CAMPAIGNS`, `photorealism`, placeholder
   de primeiro frame.
4. **Banco** — `APLICAR-ONDA-21-24.sql` esperando o SQL editor de
   `njmniwsqwohmigroswnl`.
5. **Publicar** as Ondas 30–35 no Lovable.
