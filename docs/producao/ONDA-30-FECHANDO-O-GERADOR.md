# Onda 30 — Fechando o gerador de dinheiro de demonstração

**Data:** 05/11/2026 · **Commit:** `5564956` · **Antecessor:** `59eced2` (Onda 29 + docs)

---

## 1. A pergunta que abriu esta onda

A Onda 29 tirou o modelo das **saídas** (RFQ, MRP, showroom, display). Faltava
perguntar de onde ele **entrava**. A auditoria de todos os `seedFor(` e de todas
as listas `["DEV000006", "V24-001", "U25-014", "I25-088"]` restantes encontrou
três coisas que a Onda 29 não tinha visto:

| Achado                      | O que acontecia                                                                                                                                   | Risco                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `cfo-dre.ts`                | A DRE plantava as 4 refs, somava `seedFor` + `multByRef` (tiragens 1800/1400/950/1200 e multiplicadores de preço) e imprimia o A4 com esse EBITDA | **dinheiro**                                  |
| `development.tsx`           | Arrastar um cartão chamava `ensure(ref)` + `updateMeta(ref)` → gravava o modelo no store e o **promovia a "ficha salva"**                         | **gera** a ficha que as ondas 27–29 bloqueiam |
| `OmnichannelReadinessPanel` | Com store vazio montava duas fichas `seedFor` e **exportava o feed CSV de GTIN/NCM + imprimia o Checklist Go/No-Go A4**                           | **documento emitido**                         |

A Onda 25 tinha _rotulado_ a mistura na DRE (`origem`, `somenteSalvas`), mas o
número principal continuava misto. Rotular não é o mesmo que não somar.

---

## 2. DRE — o modelo sai da conta

`computeCollectionDreSummary(sheetsMap, overhead, otb, materializadas?)`:

- `keys` = **`operationalCodes(...)`** — só fichas salvas, e templates
  materializados por `ensure()` também ficam de fora. Sem esse filtro, **abrir
  uma tela** criaria um SKU e a DRE passaria a apurá-lo.
- Morreram `multByRef` (tiragem/multiplicador do exemplo) e o `|| 99.9`
  (preço de papel). `refName` agora vem de `doc.meta?.name`, não do preset.
- `origem.referencias` passa a listar os SKUs **excluídos** — declarados, nunca
  somados. `origem.salvas` são os que entraram. `apuravel: boolean` é novo.
- Sem nenhuma ficha: `skus = []`, receita/CMV/EBITDA/`breakEven` = 0 (não
  `−R$ 85.000` de "prejuízo" inventado a partir do vazio), `—` na tela e no A4.
- `somenteSalvas` foi mantido por compatibilidade com a Onda 25 e agora espelha
  os próprios totais.
- `buildDrePrintableHtml`: corrigido o **aviso renderizado duas vezes**, trocado
  o texto para "excluídos da apuração", e os valores viram `—` quando não
  apurável. O botão "DRE Gerencial (A4)" fica desabilitado sem ficha.

Home e `/financial` passam `materializadas` e usam `fmtDre`/`fmtPecasDre`/
`fmtPctDre` para não imprimir `R$ 0,00` com cara de apuração. O saldo OTB e o
teto continuam em `fmtBrl`: são parâmetros reais do CFO, não apuração.

---

## 3. A esteira de desenvolvimento para de fabricar ficha

Extraído `src/lib/techsheet/kanban-items.ts` (lógica pura, testável):

- `KanbanRefItem.doc` é **opcional**. Referência que existe no Ciclo de Vida ou
  no banco mas não tem engenharia salva entra **sem documento**.
- `canAdvanceStage(items, ref)` bloqueia o drop; `moveItemToStage` avisa com
  `toast.error` em vez de `ensure()` + `updateMeta()`.
- Cartão sem ficha: `draggable={false}`, KPIs de Custo/PV/Margem substituídos por
  bloco âmbar "Sem ficha técnica salva" com link para o Cockpit; SAM e CAD viram
  `—`; botão "Etapa N" desabilitado.
- `averageKanbanMargin` conta **só** fichas salvas e devolve `null` → `—` quando
  não há nenhuma. Caiu também o `defaultColorwaysFor()`/`defaultEncaixeCadFor()`
  como fallback dentro de ficha salva.
- O formulário "Nova referência" continua chamando `ensure()`: ali há um usuário
  preenchendo nome/categoria/coleção. É o caminho legítimo de criação, coerente
  com o contrato da Onda 22 ("primeira edição humana promove a ficha").

---

## 4. Gate omnichannel — feed e A4 não saem sem ficha

`resolveOmnichannelInputs(sheets, materializadas)` (novo, puro) devolve
`{ docs, apuravel, provenance, excluidas }` usando `operationalCodes`. Sem ficha:

- `items = []`, estado vazio `omnichannel-sem-ficha` com link para `/tech-sheet`;
- **Exportar Feed CSV (GTIN/NCM)** e **Checklist Go/No-Go A4** desabilitados,
  com guarda também dentro dos handlers;
- fichas só materializadas (`ensure()`) aparecem em `excluidas` e não entram.

---

## 5. Frente 4 — os outros emissores que ainda plantavam as 4 refs

A auditoria mostrou que a Onda 29 tinha fechado 6 telas, mas **quatro emissores
continuavam com o seletor fixo**. Todos passaram a usar `useOperationalRefs` /
`useSelectedRef` (hook que já existia desde a Onda 22):

| Tela                           | Saída                                      | Antes                                                            | Agora                                                |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------- |
| `CuttingRoomPlanPanel`         | Ordem de Corte A4                          | `selectedRef = "DEV000006"`, `doc = resolveSheet(..., seedFor)`  | estado vazio `corte-sem-ficha`, emissão com guarda   |
| `route-engineering`            | Folha de Balanceamento A4 + escrita no BOP | `ensure(selectedRef)` + `updateBopStep` sobre o modelo           | estado vazio `balanceamento-sem-ficha`, sem `ensure` |
| `FabricRollsShadePanel`        | saldo de rolo → `estoqueDisponivel` na BOM | `ensure(targetRef)` gravava dado **real** numa BOM **inventada** | sem ficha, sincronização recusa com aviso            |
| `OutsourcingServiceOrderPanel` | OS + XML de remessa                        | `draft.refCode = "DEV000006"`                                    | `""` + validação no submit; só fichas salvas         |
| `looks` (importar rápido)      | peça do look                               | `ensure(refCode)` no ato de importar                             | só fichas salvas, sem `ensure`                       |

---

## 6. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **446/446** (eram 409)             |

Testes novos: 11 em `cfo-dre` (modelo fora da soma, `—` sem ficha, sem preço de
papel, template materializado não entra, aviso único no A4); 6 em
`kanban-items`; 3 em `omnichannel-readiness`; 24 em `onda30-emissores` — uma
**guarda de regressão que lê os fontes** e impede que qualquer emissor volte a
chamar `seedFor()` ou a plantar as quatro refs de exemplo.

---

## 7. Medição das três camadas (05/11, 6ª medição)

| Camada        | Estado                     | Evidência                                                                                                                                                           |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 30** (este commit)  | `git ls-remote`                                                                                                                                                     |
| App publicado | **Onda 29**                | entry `index-1d8-RbIh.js`, **219 chunks**; `pedidosSemFicha`, `rfq-sem-ficha`, `showroom-sem-ficha` presentes; `DRE não apurável` e `omnichannel-sem-ficha` = **0** |
| Banco         | **sem as migrações 21/24** | `PGRST205` em `stock_reservation_aging`, `PGRST202` nas 3 RPCs                                                                                                      |

O ar **avançou da Onda 28 para a 29** desde a medição anterior — publicação
nova, não cache. Publicar app não aplica SQL: o banco segue exatamente onde
estava. Detalhe e comandos em `SINCRONIA-2026-11-05.md`.

---

## 8. O que continua aberto (registrado, não escondido)

- **`digital-twin.tsx`** — 814 linhas, ainda `useState("DEV000006")`, planta as
  4 refs e chama `ensure()` **dentro do seletor do Zustand** (mutação no render).
  É simulação visual, não emite documento, mas grava `updatePreCost`. Próxima
  onda, com teste de render antes de reescrever.
- **`ai-agents.tsx`** e `ProductStudio.tsx` — copiloto/estúdio de imagem usam
  `seedFor` como **vitrine declarada** (`SheetProvenanceNote` / `origemAnalise`).
  Não decidem, não emitem, não gravam.
- **`research-gtm.ts`** — `skuRefs: ["DEV000006", "V24-001"]` em contexto de
  pesquisa GTM, não em número operacional.
- **`store.ts`** — os ~20 updaters mantêm `s.data[ref] ?? seedFor(ref)` como
  ponto de partida de edição; `materializadas` + `marcarEditada` (Onda 22)
  distinguem template de trabalho humano. Contrato travado por
  `materializacao.test.ts`; mexer aqui é uma onda própria.
- **Banco** — `docs/producao/APLICAR-ONDA-21-24.sql` continua esperando o SQL
  editor do projeto `njmniwsqwohmigroswnl`.
