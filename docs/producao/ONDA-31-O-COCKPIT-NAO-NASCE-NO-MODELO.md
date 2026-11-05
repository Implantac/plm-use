# Onda 31 — O cockpit não nasce no modelo de demonstração

**Data:** 05/11/2026 · **Commit:** `5f41a95` · **Antecessor:** `1365121` (Onda 30 + docs)

---

## 1. O último default

As Ondas 29 e 30 fecharam as **saídas** e o **gerador**, mas restava um ponto
anterior a ambos: **abrir o próprio Cockpit de Ficha Técnica**.

```ts
// antes, em src/routes/_authenticated.tech-sheet.tsx
const activeRef = (refParam?.trim() || "DEV000006").toUpperCase();
const doc = useTechSheetStore((s) => s.data[activeRef] ?? ensure(activeRef));
```

Ou seja: `/tech-sheet` sem parâmetro **escolhia `DEV000006`**, chamava `ensure()`
**dentro do seletor do Zustand** (mutação no render) e a tela inteira nascia com
BOM, BOP, custos, cartela de cores e nome do modelo. Dali o usuário exportava
`MRP_COMPRAS_DEV000006_*.csv`, imprimia Ordem de Corte A4, Dossiê de Engenharia
e publicava no catálogo — documentos de compra sobre um produto inexistente.

A auditoria dos `ensure(` restantes achou o mesmo padrão em **8 componentes**:
além do cockpit, `digital-twin`, `ProductStudio` e os seis painéis internos da
ficha (`BomBopPanel`, `PreCostPanel`, `OperationSequencePanel`,
`GradedMeasurementsPanel`, `GarmentSketchStudio`, `TechSheetVersions`).

---

## 2. O que mudou

### Cockpit (`tech-sheet.tsx`, 1063 linhas)

Novo módulo puro `src/lib/techsheet/cockpit-entry.ts`:

- `resolveCockpitRef(refParam, salvas)` → sem `?ref=` abre a **primeira ficha
  salva**; sem nenhuma, devolve `null` e a tela mostra estado vazio
  `cockpit-sem-ficha` com link para a Esteira. `DEV000006` só aparece se estiver
  realmente salva.
- `podeEmitirDocumento(provenance)` → `true` apenas para `"salva"`.
- `ensure()` **saiu do seletor**: agora fica num `useEffect` protegido por
  `activeRef && !docDoStore`. O placeholder do primeiro frame é um `seedFor`
  que **não grava** no store.
- `availableRefs` perdeu a ref plantada; continua aceitando refs reais do banco
  (produto sem ficha que o usuário quer abrir para criar engenharia).
- `productName` perdeu o fallback `"Camiseta Esportiva Dry Pro"`.
- **Cinco saídas bloqueadas** por `exigirFichaSalva()` + `disabled={!emitivel}`:
  PDF Facção, PDF Engenharia, Ordem de Corte A4, CSV Compras/MRP e Publicar
  Catálogo. `SheetProvenanceNote` no topo quando a ficha é template.

### Gêmeo digital (`digital-twin.tsx`, 814 linhas)

Era o último reduto das quatro refs plantadas. Agora usa `useOperationalRefs` +
`useSelectedRef`, `doc` vem direto do mapa, sem `ensure`, sem
`defaultColorwaysFor()`, e `sim` é `null` quando não há ficha → estado vazio
`gemeo-sem-ficha`. `?ref=` só é aceito se a ref for operacional. `renderAiTwin`
e `commitBatchToSheet` (que grava `updatePreCost`) ganharam guarda.

### Estúdio de produto (`ProductStudio.tsx`)

`techSheetRefOptions` passou a `useOperationalRefs().codes`; importar uma
referência sem ficha não chama mais `ensureTechSheet()` — avisa e não importa.

### Campanhas GTM (`marketing.tsx`)

Criar campanha sem preencher SKUs **não** ganhava mais `skuRefs: ["DEV000006"]`
escondido: a lista fica vazia.

### Ordens de Serviço (`OutsourcingServiceOrderPanel`)

`resolveReferenceTechSheet` devolve um documento **montado à mão** com NCM,
composição ABNT e BOM de exemplo quando a ref não tem ficha. A Onda 27/28 já
impedia a _emissão_, mas a tabela ainda exibia `computeServiceOrderMetrics`
calculado sobre esse documento — CFOP, saldo, líquido a pagar e status com cara
de operação. Agora as OS sem ficha saem de `enrichedOrders` (e portanto dos
totais de capacidade e financeiro) e são **declaradas** num bloco vermelho
`os-sem-ficha`, listando número e referência. Mesmo padrão de
`pedidosSemFicha` da Onda 29 no MRP.

---

## 3. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **461/461** (eram 446)             |

Testes novos (15): 4 em `cockpit-entry` (sem ref → `null`, precedência de
`?ref=`, normalização, veto por procedência) e 11 de guarda em
`onda31-entrypoints` — leitura dos fontes que impede reintroduzir as quatro
refs, `?? ensure(` no seletor, o SKU default escondido, ou perder o filtro
`emitivel` nas OS.

---

## 4. Medição das três camadas (7ª, 05/11)

| Camada        | Estado                      | Evidência                                                                  |
| ------------- | --------------------------- | -------------------------------------------------------------------------- |
| Repositório   | **Onda 31** (este commit)   | `git ls-remote`                                                            |
| App publicado | **Onda 29** — sem alteração | entry ainda `index-1d8-RbIh.js`, 218 chunks; marcadores da 30 e 31 = **0** |
| Banco         | **sem as migrações 21/24**  | `PGRST205` na view, 3× `PGRST202` nas RPCs                                 |

Nem a Onda 30 nem a 31 foram publicadas. O banco segue onde estava desde a 4ª
medição. Publicar app não aplica SQL.

---

## 5. O que resta, medido e registrado

1. **`dpp-expedition.ts :: resolveDoc`** — ainda fabrica três fichas completas
   (`V24-001`, `U25-014`, `I25-088`) com NCM, composição, encaixe CAD e BOM
   próprios. Todos os **emissores** já estão protegidos por `emitivel`, e a Onda
   31 tirou a tela que exibia as métricas; mas o resolvedor central continua
   devolvendo um documento inventado. Correção correta: `ResolvedRef.doc:
TechSheetData | null`, ajustando 8 consumidores e `dpp-expedition.test.ts`.
   É a próxima onda.
2. **Seis painéis internos da ficha** (`BomBopPanel`, `PreCostPanel`,
   `OperationSequencePanel`, `GradedMeasurementsPanel`, `GarmentSketchStudio`,
   `TechSheetVersions`) ainda usam `s.data[ref] ?? ensure(ref)` no seletor. São
   componentes de **edição**, recebem a ref de um cockpit que já existe, e a
   Onda 22 rotula o resultado como `template`. Dívida arquitetural (mutação no
   render), não número operacional.
3. **`store.ts`** — ~20 updaters mantêm `?? seedFor(ref)` como ponto de partida
   de edição; contrato travado por `materializacao.test.ts`.
4. **Vitrines declaradas** — `ai-agents.tsx` (copiloto), `research-gtm.ts`
   (`INITIAL_GTM_CAMPAIGNS` com `skuRefs` de exemplo) e `photorealism.ts`
   (NCM em prompt de imagem). Não decidem, não emitem, não movem dinheiro.
5. **Banco** — `docs/producao/APLICAR-ONDA-21-24.sql` continua esperando o SQL
   editor de `njmniwsqwohmigroswnl`.
