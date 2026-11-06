# Onda 34 — O molde de demonstração não é engenharia

**Data:** 05/11/2026 · **Antecessor:** `9e5498a` (Onda 33 + docs)

---

## 1. O limite que a Onda 33 deixou aberto

A Onda 33 barrou o DPP quando faltam NCM, origem, composição ou encaixe — mas
**registrou o limite**: "uma ficha salva que preencha NCM e origem mas mantenha
a composição/encaixe exatamente iguais aos do modelo ainda passa. A distinção
definitiva entre _declarado_ e _semeado_ exige mexer no `store.ts`."

Ao medir o `store.ts`, o furo era **maior do que o registrado**:

```ts
defaultEtiquetagemFor() => {
  composicao: [{ fibra: "Poliéster", pct: 96 }, { fibra: "Elastano", pct: 4 }],
  instrucoesExtras: "Lavar pelo avesso; não passar ferro sobre o transfer ou bordado.",
}
defaultEncaixeCadFor() => {
  eficienciaPct: 88.3, larguraEnfestoM: 1.8, comprimentoRiscoM: 4.65,
  arquivoMolde: "DEV000006_CAMISETA_DRY_PRO_v4.ADS", sistemaCad: "Audaces",
}
seedFor(ref) => { etiquetagem: defaultEtiquetagemFor(), encaixeCad: defaultEncaixeCadFor() }
```

Ou seja, **toda ficha nova** nascia com composição, eficiência de risco,
largura de enfesto e até o nome do arquivo de molde do produto de
demonstração. E `computeLayAndCutPlan` ainda tinha três defaults numéricos
_escondidos_:

```ts
const gramaturaGm2 = Math.max(60, Number(mainFabric?.gramaturaGm2) || 155);
const larguraEnfestoM = Math.max(0.8, Number(cad.larguraEnfestoM) || 1.8);
const comprimentoRiscoM = Math.max(0.5, Number(cad.comprimentoRiscoM) || 5.35);
```

Mesmo esvaziando o molde, esses `||` **reconstruíam** 1,8 m, 5,35 m e 155 g/m².
Uma ficha sem risco CAD homologado produzia mesa de enfesto, metragem linear,
kg de malha, fardos numerados e a Ordem de Corte A4 — todos calculados sobre o
modelo. O gate de estágio aprovava o item "Risco CAD Homologado (≥75%)" com
88,3% emprestada.

---

## 2. O que mudou

### Raiz: o molde virou branco

`defaultEtiquetagemFor` / `defaultEncaixeCadFor` foram **renomeados** para
`emptyCareLabelSpec()` / `emptyCadMarkerSpec()` — o nome antigo sugeria
"preenchido". Agora devolvem `composicao: []`, `ncm`/`paisOrigem`/`instrucoesExtras`
vazios e `{ eficienciaPct: 0, larguraEnfestoM: 0 }`. `seedFor()` passa a usar
`encaixeCad: undefined`: a ficha nova **nasce sem risco CAD**, e não com um
objeto zerado que faria "0%" parecer engenharia registrada. O changelog do
modelo também deixou de afirmar "Ajuste de encaixe CAD (88,3%)".

Os moldes brancos sobrevivem **apenas** em três papéis de edição: `seedFor`, o
`GarmentSketchStudio` (editor de etiqueta) e os formulários de CAD
(`PreCostPanel`, `BomBopPanel`, `tech-sheet`). Nenhum emissor de documento os
usa mais — há guarda de fonte para isso.

### Plano de corte: `apuravel` explícito

`CutOrderPlanResult` ganhou `apuravel: boolean` e `motivoNaoApuravel: string | null`.
Sem largura de enfesto, comprimento de risco, gramatura do tecido na BOM ou
composição ABNT **declarados**, `computeLayAndCutPlan` devolve `spreads: []`,
`bundles: []`, todos os totais zerados e o motivo nomeando cada pendência.
`buildCutOrderPrintableHtml` lança em vez de imprimir; o painel mostra o motivo
e barra o botão de emissão. Morreram `|| 1.8`, `|| 5.35` e `|| 155`.

### Gates e documentos alinhados

| Módulo                                                            | Antes                                                           | Agora                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `evaluateTechSheetGateReadiness`                                  | `cadOk` com 88,3% emprestada; `etqOk` aceitava NCM de 7 dígitos | `cad` ausente → `false` + "Risco CAD não declarado"; NCM exatamente 8 dígitos (Ondas 28/33) |
| `buildCutOrderPrintHtml` (MRP)                                    | `88.3% (Audaces)`, `1.8 m × 4.65 m`, arquivo do DEV000006       | `—` declarado; com CAD declarado, imprime o valor real                                      |
| `digital-twin`                                                    | `compResumo` vazio silencioso                                   | `"Composição não declarada" · NCM não declarado`                                            |
| `usecloud-adapter`, `outsourcing-os`, `linesheet`, `sourcing-rfq` | `?? defaultEtiquetagemFor()`                                    | `doc.etiquetagem?.` com ausência declarada                                                  |
| `tech-sheet.tsx`                                                  | formulário sugeria `sistemaCad: "Audaces"`                      | campo em branco                                                                             |
| `PreCostPanel`, `BomBopPanel`, cockpit                            | `0%` / `88,3%` como KPI                                         | `—` quando não declarado                                                                    |

O gate omnichannel, que já exigia composição não-vazia, passou a reprovar a
ficha nova (`PENDENCIA_ENGENHARIA`) — coerente com a Onda 28, que já barrava
por NCM.

---

## 3. Escopo deliberado: o que o seed **ainda** carrega

`seedFor()` continua sendo uma ficha de demonstração com BOM custeada,
colorways, medidas, BOP, pré-custo e histórico de versão. Esses números **não**
foram removidos nesta onda: desde as Ondas 25/30 eles só entram em DRE,
pré-custo e pricing quando a referência está **materializada** — há um gate
anterior protegendo essa fronteira. A Onda 34 atacou o que não tinha gate:
composição, etiqueta e risco CAD, que até aqui eram consumidos direto do
documento. Reescrever o seed inteiro é outra onda e quebraria dezenas de
testes que descrevem o produto de demonstração.

**Fixture nova:** `src/test/ficha-declarada.ts` é o outro lado do contrato — o
que um usuário _declara_ para a ficha virar documento. Os valores 96/4, 88,3% e
1,8 m agora existem **só no teste**, como entrada explícita, e o arquivo de
molde não cita o DEV000006.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **495/495** (eram 481)             |

**14 testes novos** (`onda34-seed.test.ts`): o seed nasce vazio; os moldes de
edição são brancos; gate omnichannel reprova; plano de corte não apurável com
arrays vazios e motivo completo; A4 recusada; com engenharia declarada o plano
volta a ser apurável (24 h de descanso de malha); gate de estágio **60%** com
dois checks reprovados (antes 80% com o CAD emprestado); relatório MRP imprime
`—` e, com CAD declarado, imprime `88.3` + `RISCO_HOMOLOGADO_v1.ADS`; DPP de
ficha nova lista as quatro pendências; quatro guardas de fonte contra
reintroduzir os defaults numéricos, os moldes nos emissores e uma emissão sem
checar `apuravel`.

Sete testes antigos mudaram de **fixture**, não de exigência — passaram a usar
`fichaDeclarada()`. A asserção do gate de estágio foi **endurecida** de 80% para
60%: sem engenharia declarada são dois checks reprovados, não um.

---

## 5. Medição das três camadas (10ª, 05/11)

| Camada        | Estado                     | Evidência                                                                                                                                                                                                |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 34** (este commit)  | `git ls-remote`                                                                                                                                                                                          |
| App publicado | **Onda 29**, sem alteração | mesmo entry `index-1d8-RbIh.js`, 218 chunks; `Poliéster` ainda aparece **11 vezes** no bundle; `DRE não apurável`, `cockpit-sem-ficha`, `Risco CAD não declarado`, `Plano de corte não apurável` = **0** |
| Banco         | **sem as migrações 21/24** | `PGRST205` na view, 3× `PGRST202` nas RPCs                                                                                                                                                               |

O ar está **cinco ondas** atrás do repo (30, 31, 32, 33, 34). As 11 ocorrências
de "Poliéster" no bundle são a prova de que o modelo de demonstração continua
sendo servido em produção. O banco não muda desde a 4ª medição. Publicar app
não aplica SQL.

---

## 6. O que resta

1. **BOM/custos do seed** — protegidos pelo gate de materialização, mas ainda
   são dados de demonstração dentro de toda ficha nova. Medir se algum emissor
   os consome sem passar pelo gate (próximo risco natural).
2. **Seis painéis internos da ficha** com `ensure()` dentro do seletor do
   Zustand — dívida arquitetural, sem número operacional.
3. **Vitrines declaradas** — `ai-agents`, `INITIAL_GTM_CAMPAIGNS`,
   `photorealism`, placeholder de primeiro frame do cockpit.
4. **Banco** — `APLICAR-ONDA-21-24.sql` esperando o SQL editor de
   `njmniwsqwohmigroswnl`.
5. **Publicar** as Ondas 30–34 no Lovable.
