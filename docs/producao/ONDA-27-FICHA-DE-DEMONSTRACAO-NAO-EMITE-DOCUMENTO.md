# Onda 27 — Ficha de demonstração não emite documento

**Data:** 05/11/2026 · **Antecessor:** `7b7cdba`

---

## 1. O que estava acontecendo

`resolveReferenceTechSheet()` devolvia `seedFor(refCode)` quando a referência não
tinha ficha salva. Como o retorno era só o documento, **ninguém a jusante sabia
que estava lendo o modelo de demonstração** — e o modelo seguia até o fim da
linha: preço, NCM, composição, pegada de carbono, XML.

Medido no código antes desta onda:

| Onde                                                   | O que saía com dado inventado                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `computeDigitalProductPassport`                        | composição, **NCM `6109.90.00` por default**, origem, kg CO₂e, litros de água, circularidade, selo ESG A–D |
| `computePackingAndNfePreview`                          | NCM default, preço `pv * 0.52` com fallback `119.9`, ICMS 18/12%, PIS/COFINS                               |
| `buildPreNfeXml400` / `buildPackingListPrintableHtml`  | emitia o documento completo                                                                                |
| `buildDropMediaKitHtml`                                | tabela com classe ESG e preço por SKU                                                                      |
| `buildRemessaNfeXml400` / `buildBlindServiceOrderHtml` | remessa ao terceiro e OS cega                                                                              |
| `computePartnerMetrics`                                | ocupação de capacidade do parceiro somando SAM de OS sem ficha                                             |
| Home (`/dashboard`)                                    | card "Rating ESG · kg CO₂e" do `DEV000006`                                                                 |
| `_authenticated.commercial`                            | plantava `DEV000006`, `V24-001`, `U25-014`, `I25-088` na expedição                                         |

Um passaporte digital com composição e NCM inventados é declaração ao
consumidor. Um pré-XML com NCM default é nota fiscal errada esperando
acontecer. Não é cosmético.

## 2. A regra

> **Só ficha `salva` — trabalho do usuário — pode virar documento.**

Template (cópia intacta do modelo) também não: por dentro é demonstração.

## 3. Como foi implementado

**O gate mora no tipo, não na disciplina de quem chama.**

```ts
export interface ResolvedRef {
  refCode: string;
  doc: TechSheetData; // existe sempre, para a vitrine não ficar vazia
  provenance: SheetProvenance; // "salva" | "template" | "referencia"
  emitivel: boolean; // provenance === "salva"
}
```

- `resolveReferenceTechSheet()` passou a devolver `ResolvedRef` — quem lia
  `doc.meta` quebrou no `tsc` e foi obrigado a decidir.
- `computeDigitalProductPassport(ref)` devolve **`null`** quando `!emitivel`.
  Não existe caminho para um DPP com números de modelo.
- `ExpeditionLineInput.provenance` é **obrigatório**: um call site novo não
  consegue esquecer o campo (o compilador barra), e `computePackingAndNfePreview`
  separa as linhas em `lines` e `ignoradas: { refCode, motivo }[]` com motivo
  `sem-ficha` | `template` | `sem-ncm`.
- `buildPreNfeXml400`, `buildPackingListPrintableHtml` e `buildDppPrintableHtml`
  lançam `DocumentoNaoEmitivelError` se houver linha pendente.
- NCM deixou de ter default: `etq.ncm || "6109.90.00"` virou campo vazio, e a
  expedição exige 8 dígitos para faturar.
- Composição vazia deixou de afirmar "100% Algodão" → "Composição não informada
  na ficha".

## 4. Nas telas

| Tela                   | Comportamento novo                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`           | card DPP mostra `—` e "Sem ficha salva: o passaporte não é emitido"                                                                                         |
| `/pieces-report` (DPP) | grade só com passaportes emitíveis; estado vazio explica o que falta (NCM + composição ABNT + salvar); rodapé lista o que ficou fora e por quê              |
| `/commercial`          | expedição lista **só fichas salvas**; NCM ausente aparece em vermelho como "sem NCM"; banner vermelho + botões bloqueados nomeando cada referência impedida |
| PCP · OS de terceiros  | XML de remessa e OS cega bloqueados; toast nomeia a referência                                                                                              |
| Media kit do drop      | sem ficha salva, a tabela diz que nada é declarado                                                                                                          |
| Capacidade do parceiro | OS sem ficha não entram na ocupação                                                                                                                         |

## 5. Testes

`dpp-expedition.test.ts` reescrito para a regra nova (10 casos, era 2):

- resolve marca `salva` / `referencia` / `template` corretamente
- DPP de referência é `null`
- expedição ignora referência sem ficha, e diz o motivo
- ficha salva **sem NCM** também é barrada (não vira `6109.90.00`)
- os três geradores lançam `DocumentoNaoEmitivelError`
- a mensagem de erro nomeia `I25-088:sem-ficha`

Dois testes antigos **afirmavam a ficção** e foram corrigidos:
`outsourcing-os.test.ts` esperava `piecesInPossession === 176` contando OS sem
ficha (agora: 0 sem mapa, 176 com fichas salvas);
`research-gtm.test.ts` esperava o media kit citando `DEV000006` sem ficha.

## 6. Gates

| Gate           | Resultado                                             |
| -------------- | ----------------------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes                 |
| prettier       | ✅ limpo                                              |
| vitest         | ✅ **403/403** (eram 395; +9 líquidos, −2 reescritos) |

## 7. O que esta onda NÃO resolve (e fica dito)

- **`linesheet.ts`**: `computeLookFinancialSummary` ainda cai em `seedFor` e,
  pior, inventa preço de fallback (`R$ 249,90 / 169,90 / 289,90 / 89,90`) e
  custo = 36% do preço para peça sem ficha. É a mesma mentira, em outro
  documento (line sheet B2B). Onda 28.
- **`/showroom`, `/supplier-portal`, `/prints`, `/display`**: seguem usando
  `sheetsMap[r] ?? seedFor(r)` para **exibir**. Não emitem documento, mas
  mostram números de modelo — a marcação de procedência da Onda 23 cobre parte.
- **Alíquotas**: ICMS 18/12 e PIS/COFINS continuam fixos no código. São
  parâmetros de simulação do pré-XML, não emissão fiscal — o documento segue
  sendo "pré", e agora só sai sobre ficha real.
