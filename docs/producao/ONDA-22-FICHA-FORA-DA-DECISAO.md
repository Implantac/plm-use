# Onda 22 — Ficha de demonstração fora do caminho de decisão

**Data:** 04/11/2026 · **Antecessor:** `dd42976` (Onda 21)

---

## 1. O que estava errado

A Onda 19 criou o selo de procedência: a tela mostra `Ficha salva` ou
`Ficha de referência (demonstração)`. A Onda 20 espalhou o selo. **O selo estava
mentindo**, por dois motivos independentes.

### 1.1 `ensure()` no render transformava seed em "ficha salva"

Doze telas chamam `useTechSheetStore().ensure(ref)` para nunca renderizarem vazio.
`ensure()` grava `seedFor(ref)` **no store**. Como o selo só perguntava "existe no
store?", o resultado era:

> abrir `/route-engineering` uma vez ⇒ `DEV000006` deixa de ser referência e passa
> a ser "ficha salva" para sempre — com BOM, tempos e custos de exemplo.

Ou seja: a própria visita à tela apagava a evidência de que o dado era de
exemplo. Quem decide com base nesse selo (comitê de gate, liberação de corte,
cotação) passava a decidir sobre número de vitrine.

### 1.2 O seed entrava no caminho de decisão, com nome de gente

Quatro referências de demonstração (`DEV000006`, `V24-001`, `U25-014`,
`I25-088`) eram concatenadas à lista real em várias telas:

| Tela                  | O que acontecia                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/approvals`          | o comitê **aprovava etapa** de uma ficha de demonstração e o toast dizia "aprovada"                                  |
| `/development`        | "Garante DEV000006 sempre visível na esteira" plantava um produto inexistente no kanban, arrastável entre etapas     |
| `/development` (novo) | o formulário vinha com `cloneFrom: "DEV000006"`: **todo produto novo nascia com BOM e custos de exemplo**, sem aviso |
| `/looks`              | "Sugerir com IA" chamava `ensure("DEV000006")` e o "complemento" era sempre `V24-001`                                |
| `/ai-agents`          | dizia _"conectado aos seus números reais"_ enquanto analisava o seed                                                 |

## 2. A correção

**Novo estado no store:** `materializadas` — refs que existem só porque `ensure()`
as criou. Toda ação de edição (`updateMeta`, BOM, BOP, medidas, cores, etiqueta,
encaixe, preCost, aplicação, versão, duplicação) remove a ref do mapa. A regra
fica simples e auditável:

> ficha é **salva** quando alguém a editou; é **template** quando só foi
> materializada; é **referência** quando nem está no store.

`SheetProvenance` passa a ter três valores (`salva | template | referencia`) e o
`SheetProvenanceNote` ganhou o estado intermediário: _"Ficha criada do modelo
padrão — a ficha existe no seu workspace, mas ninguém editou nada"_.

**`operationalCodes(sheets, incluirReferencias, materializadas)`** substitui o
`new Set(["DEV000006", ...])` como fonte do que pode virar decisão: devolve só o
que tem trabalho humano, com a opção explícita de inclusão para telas de vitrine.

**Telas ajustadas:** `/approvals` (lista vazia explica como criar ficha real, em
vez de oferecer quatro exemplos), `/development` (fim do "sempre visível"; o campo
de clone virou select só com fichas salvas, default "ficha padrão em branco"),
`/looks` (sugestão só com ficha salva; se não houver, erro explicando), `/ai-agents`
(selo "Sem ficha salva · análise sobre referência" em vez da frase falsa).

## 3. Testes

`src/lib/techsheet/materializacao.test.ts` (10 casos) trava o comportamento:

- `ensure` marca como `template`, não `salva`;
- chamada antiga (sem o mapa) mantém presença = `salva` — nada quebra retroativamente;
- primeira edição humana promove para `salva` (meta e BOM);
- clonar para ref nova conta como trabalho do usuário;
- `operationalCodes` ignora o que só foi materializado; uma visita a
  `/route-engineering` **não** cria produto para decidir.

`src/lib/techsheet/provenance.test.ts` ganhou `operationalCodes` e o campo
`templates` no resumo.

## 4. Gates

| Gate           | Resultado                                  |
| -------------- | ------------------------------------------ |
| `tsc --noEmit` | ✅ 0 erros                                 |
| eslint         | ✅ **0 erros**, 20 warnings preexistentes  |
| prettier       | ✅ limpo                                   |
| vitest         | ✅ **361/361** (eram 349 — +12 desta onda) |
| Suíte SQL      | ✅ 148 asserções (não tocada nesta onda)   |

## 5. Provado × não provado

| Item                                        | Estado                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Regra `ensure` ⇒ `template`                 | ✅ provada em teste de store                                                  |
| Promoção para `salva` na primeira edição    | ✅ provada (meta e BOM)                                                       |
| Gate não aprova ficha de demonstração       | ✅ por construção (`operationalCodes`) + teste                                |
| Telas renderizam como esperado no navegador | ❌ **não provado** — exige login; o E2E autenticado segue SKIP sem credencial |
| Build publicado tem esta onda               | ❌ o ar continua na Onda 19                                                   |

## 6. Resíduo conhecido (honesto)

- **Store já persistido:** quem usou o sistema antes desta onda tem `data` cheio de
  refs materializadas sem o mapa `materializadas` — elas continuam contando como
  "salvas". Migrar isso exigiria adivinhar se houve edição; preferi não inventar.
  Na prática, o usuário reabre a ficha e salva.
- **`ensure()` continua materializando** nas 12 telas (é o que evita tela vazia).
  O que mudou é que isso não mente mais sobre a origem.
- **`/prints`, `/colors`, `/quality`, `/cad`, `/measurements`** ainda usam os quatro
  códigos de demonstração como valor inicial de seletor. São telas de saída
  (documento), não de decisão — a próxima onda pode trocar o default por "primeira
  ficha salva", mas hoje elas ao menos mostram o selo de template ao abrir.
