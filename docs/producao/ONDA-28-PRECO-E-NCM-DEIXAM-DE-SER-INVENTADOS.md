# Onda 28 — Preço e NCM deixam de ser inventados

**Data:** 05/11/2026 · **Antecessor:** `7c91574`

---

## 1. De onde veio

A Onda 27 fechou a porta do **documento** para ficha não salva. Ficaram duas
portas abertas, ambas de dinheiro e de fisco:

1. **Line sheet do look** — peça sem ficha recebia preço inventado por papel
   (R$ 249,90 / 169,90 / 289,90 / 89,90) e custo = 36% desse preço.
2. **NCM default** — `defaultEtiquetagemFor()` nascia com `6109.90.00`, e mais
   quatro lugares completavam NCM ausente com o mesmo código (ou pior,
   `padEnd(8, "0")` inventava dígitos).

O item 2 invalidava parte da própria Onda 27: o gate de 8 dígitos aceitava
`6109.90.00` porque o default o produzia.

## 2. Line sheet do look (`linesheet.ts`)

`computeLookFinancialSummary` agora:

| Antes                | Agora                                                      |
| -------------------- | ---------------------------------------------------------- |
| preço por papel      | `unitSuggestedPrice: null`                                 |
| custo = 36% do preço | `unitIndustrialCost: null`                                 |
| somava tudo          | totais só quando **todas** as peças têm ficha (`completo`) |
| kit = total × 0,92   | kit `null` se incompleto                                   |

Campos novos: `comProve, semPreco, codesSemFicha, completo`.

Na tela `/looks`: `brl(null)` devolve `—`; o card diz "Kit — 2 sem ficha"; o
painel mostra "Custeio incompleto: 1 de 2 peças sem ficha salva (BER-010)"; a
peça sem preço leva "(sem ficha)" na lista.

## 3. Line sheet do mapa de coleção

- `_authenticated.collection-map.tsx` plantava `DEV000006` — saiu.
- `sheetsMap[k] ?? seedFor(k)` — saiu; o mapa usa só ficha que existe.
- `techSheetToMatrixRow`: `price … || 149` — saiu. Sem referência de preço, a
  linha fica **0** e o documento imprime `—`.
- NCM ausente no impresso: `"sem NCM"` (era `6109.90.00`).
- Composição ausente: `"Composição não informada"` (era `"Composição padrão comercial"`).
- Rodapé: receita alvo declarada **e** quantas referências ficaram fora, por nome.

## 4. NCM deixa de ser default

| Arquivo                              | Antes                                                | Agora                                         |
| ------------------------------------ | ---------------------------------------------------- | --------------------------------------------- |
| `store.ts` `defaultEtiquetagemFor()` | `ncm: "6109.90.00"`, `paisOrigem: "Feito no Brasil"` | `""` e `""`                                   |
| `linesheet.ts` (CSV)                 | `6109.90.00`                                         | `sem NCM` / `sem ficha`                       |
| `outsourcing-os.ts` (remessa)        | `(etq.ncm \|\| "6109.90.00").padEnd(8,"0")`          | NCM ≠ 8 dígitos ⇒ `DocumentoNaoEmitivelError` |
| `sourcing-rfq.ts`                    | `\|\| "6109.90.00"`                                  | `\|\| ""`                                     |
| `omnichannel-readiness.ts`           | `\|\| "6109.10.00"`                                  | `""`                                          |

Consequência de projeto: ficha nova abre com **NCM em branco**. É a verdade — a
classificação fiscal é decisão do usuário, não do sistema.

## 5. Gate de catálogo: NCM é veto

`evaluateOmnichannelReadiness` passou a ter 6 checks (entrou `hasNcm`) e:

```ts
goNoGoStatus = readinessScorePct >= 80 && hasNcm ? "APTO_GO_LIVE" : "PENDENCIA_ENGENHARIA";
```

Sem o veto, 5 de 6 checks davam **83%** e a ficha ia para o feed VTEX/Shopify
como "apta" sem classificação fiscal.

O gate **técnico** (`evaluateTechSheetGateReadiness`) não trava por NCM: 4 de 5
checks = 80%, e produzir não exige NCM. Quem trava é o catálogo e o documento.

## 6. Testes

Vitest **407/407** (eram 405). Casos novos/alterados:

- look com peça sem ficha: preços `null`, kit `null`, `completo: false`
- look completo: kit = total × 0,92 e margem > 40%
- line sheet impresso: `sem NCM`, `Composição não informada`, "exclui 1 referência(s) sem preço"
- ficha sem NCM: `ncmFiscal === ""`, status `PENDENCIA_ENGENHARIA`, CSV sem NCM inventado
- gate técnico sem NCM: 80%, check `abnt` reprovado
- remessa/OS/CSV/ficha: fixtures agora trazem NCM real (é o que ficha salva tem)

Três testes quebravam porque **dependiam do default**: usecloud esperava
`ncm: "6109.90.00"` no SKU, cut-order esperava gate 100%, outsourcing tentava
emitir remessa sem NCM. Os três foram corrigidos para a regra nova.

## 7. Gates

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **407/407**                        |

## 8. O que continua de fora

- **`preCost` da ficha**: quem calcula preço sem `targetPreco` usa
  `targetCusto × (1 + markup)`; isso é conta declarada na própria ficha, não
  default escondido — fica.
- **`photorealism.ts`** cita `NCM ${doc.etiquetagem?.ncm ?? "6109.90.00"}` dentro
  de um prompt de imagem. Não é documento; é texto de prompt. Registrado.
- **API/catálogo público**: o feed agora pode sair com `ncm_sefaz` vazio. É
  intencional, mas quem consome precisa aceitar campo vazio — vale conferir no
  primeiro uso real.
