# Onda 25 — O EBITDA da home deixa de ser ficção

**Data:** 04/11/2026 · **Antecessor:** `c16c8fc` (Onda 24)

---

## 1. O número que abre o sistema

Primeiro card depois do login, em `/`:

```
EBITDA Projetado Coleção
R$ 312.845        ← calculado sobre quatro fichas de exemplo
Break-Even 1.204 pçs
```

`computeCollectionDreSummary(sheetsMap)` montava a lista de SKUs assim:

```ts
new Set(["DEV000006", "V24-001", "U25-014", "I25-088", ...Object.keys(sheetsMap)]);
```

Quatro fichas de demonstração entram **sempre**. Com o workspace vazio, a DRE da
coleção é 100% modelo — e mesmo com uma ficha real salva, ela é diluída por
quatro SKUs fictícios, com tiragem fixa (1.800 / 1.400 / 950 / 1.200 peças) e
multiplicador de preço (1,0 / 1,35 / 1,85 / 1,65) escritos no código.

Efeito colateral no OTB: `otbCommittedBrl = cmvMaterial`, então o "saldo do
orçamento de compra" também era consumido por material de exemplo.

Pior que o card da home: **`buildDrePrintableHtml` imprimia isso em A4** como "DRE
Gerencial Projetada da Coleção", sem uma linha dizendo que os números eram de
vitrine. Documento que sai da empresa com papel timbrado.

## 2. O que mudou

A função passa a declarar de onde veio cada SKU, sem perder a simulação (que é
útil quando o usuário quer ver o formato antes de ter ficha):

```ts
dre.origem = {
  salvas: ["V24-001"],
  referencias: ["DEV000006", "U25-014", "I25-088"],
  apenasReferencia: false,
};
dre.skus[i].salva = true | false;
dre.somenteSalvas = { totalPieces, grossRevenue, contribuicaoBrl };
```

**`/` (home)**

- EBITDA e volume mostram **`—`** com "Sem ficha salva: a coleção existe só no
  modelo" quando não há nenhuma ficha salva;
- com fichas mistas, o número aparece acompanhado de "N SKU de demonstração" no
  rodapé do card;
- o herói do Passaporte Digital (DPP) ganha selo **Demonstração — não usar para
  decidir** enquanto `DEV000006` não for editado.

**`/financial`**

- selo no topo: `Dados reais` / `Parcial: banco + referência` / `Demonstração`;
- lista nominal dos SKUs de demonstração em monospace;
- selo em cada linha da tabela de rentabilidade que é SKU de modelo.

**DRE impressa**

- o A4 abre com tarja âmbar: _"Documento com dados de demonstração. SKU(s) sem
  ficha salva: … Os valores desses SKUs vêm do modelo, não da engenharia da
  empresa."_ — e a tarja **não aparece** quando todos os SKUs são salvos.

Sobre `somenteSalvas`: o overhead fixo (`fixedOverheadBrl`) é da operação inteira.
Rateá-lo só entre as fichas salvas daria EBITDA falso para baixo, então esse campo
é **margem de contribuição**, não EBITDA. A distinção está no tipo e no comentário
para ninguém somar errado depois.

## 3. Testes

`cfo-dre.test.ts` — de 2 para **8 casos**:

- sem ficha salva, a coleção inteira é demonstração e os quatro códigos são listados;
- só o SKU vindo do store conta como salvo (e o `salva` na linha do SKU reflete isso);
- `somenteSalvas` ignora o modelo em peças e receita;
- com todas as fichas salvas, `referencias` fica vazio;
- A4 **com** SKU de demonstração traz a tarja e o nome do SKU;
- A4 **sem** SKU de demonstração não traz a tarja.

## 4. Gates

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **384/384** (eram 378)             |
| Suíte SQL      | 163 asserções (não tocada nesta onda) |

## 5. Provado × não provado

| Item                                    | Estado                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A DRE separa SKU salvo de SKU de modelo | ✅ teste unitário                                                                               |
| A4 imprime a tarja só quando há modelo  | ✅ teste sobre o HTML gerado                                                                    |
| Card da home mostra `—` sem ficha salva | ⚠️ por construção (condicional sobre `dre.origem.apenasReferencia`), **não visto no navegador** |
| Build compila                           | ✅ CI (`npm run build` no job `quality`)                                                        |
| Ar publicado tem esta onda              | ❌ o ar continua na Onda 19                                                                     |

## 6. Resíduo conhecido

- **`linesheet.ts` e `dpp-expedition.ts`** ainda semeiam SKUs de demonstração na
  folha de linha e na expedição. Mesmo padrão, superfície menor — próximo lote.
- **Tiragem e multiplicador fixos** dos quatro SKUs de referência continuam no
  código (`multByRef`). Enquanto eles existirem como referência, a DRE mista soma
  números que não têm origem declarada por SKU — agora ao menos isso está dito na
  tela e no papel.
- **OTB** herda o CMV de material da DRE: com SKU de modelo na conta, o saldo do
  orçamento fica contaminado. Separar exigiria OTB por SKU; não fiz.
