# Onda 32 — O resolvedor de referência não inventa documento

**Data:** 05/11/2026 · **Commit:** `d08fccb` · **Antecessor:** `e8181c7` (Onda 31 + docs)

---

## 1. A raiz que sobrava

As Ondas 27/28 barraram a **emissão** de documento sem ficha salva. A 31 tirou
a tela que exibia métricas calculadas sobre o documento inventado. Mas o
**produtor** continuava vivo em `src/lib/techsheet/dpp-expedition.ts`:

```ts
// antes
function resolveDoc(refCode, sheetsMap): TechSheetData {
  if (sheetsMap[refCode]) return sheetsMap[refCode]!;
  const base = seedFor(refCode);
  if (refCode === "V24-001") return { ...base,
    meta: { name: "Camisa Polo Piquet Pima" },
    etiquetagem: { ncm: "6105.10.00", composicao: [{ fibra: "Algodão Pima", pct: 100 }] },
    encaixeCad: { eficienciaPct: 86.4 },
    bom: /* custo 12.1 */ };
  // ... U25-014 e I25-088 idem
  return base;
}
```

Três fichas **completas e diferentes entre si**, montadas à mão, com nome
comercial, NCM, composição ABNT, eficiência de encaixe e custo de BOM próprios.
`ResolvedRef.doc` era `TechSheetData` — sempre presente — com o comentário
"senão a vitrine fica vazia". `emitivel: false` impedia o PDF, mas qualquer
consumidor que lesse `ref.doc` recebia engenharia inventada: era só esquecer de
checar `emitivel` e o número aparecia como real. Foi exatamente o que a Onda 31
encontrou na tabela de Ordens de Serviço.

---

## 2. O contrato novo

```ts
export interface ResolvedRef {
  refCode: string;
  doc: TechSheetData | null; // null = sem ficha salva
  provenance: SheetProvenance;
  emitivel: boolean;
}
```

- `resolveReferenceTechSheet` devolve `sheetsMap[refCode] ?? null`. **Os três
  blocos fabricados saíram inteiros**, junto com `seedFor` do arquivo.
- `emitivel = provenance === "salva" && doc !== null`.
- `computeDigitalProductPassport` barra `!emitivel || !doc` antes de qualquer
  cálculo de carbono, água, circularidade ou nota ESG.
- `ExpeditionLineInput.doc` também é `TechSheetData | null`. O filtro da
  expedição usa um **type predicate** (`i is LinhaValida`) e barra `!i.doc`
  **antes** de ler NCM — com motivo `sem-ficha`. Nenhum `!` de não-nulidade.

### Consumidores ajustados (8)

| Arquivo                        | Ajuste                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| `OutsourcingServiceOrderPanel` | `filter` → `flatMap`: só OS com `emitivel && doc` entram nas métricas |
| `outsourcing-os.ts`            | capacidade do parceiro ignora `!ref.doc`                              |
| `research-gtm.ts`              | media kit exige `ref.doc` antes de precificar                         |
| `commercial.tsx`               | nome e NCM com `doc?.` na tabela de expedição                         |
| `dashboard.tsx`                | `dppHero` já tratava `null` (Onda 25)                                 |
| `DppPassportPanel`             | já usava o retorno `null` do DPP                                      |
| `dpp-expedition.test.ts`       | contrato reafirmado                                                   |
| `onda31-entrypoints.test.ts`   | guarda atualizada para o `flatMap`                                    |

---

## 3. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **471/471** (eram 461)             |

Testes novos (10): as 4 refs que antes eram fabricadas agora devolvem `doc ===
null`; ficha salva devolve **o próprio objeto** (identidade, sem cópia);
`emitivel: true` com `doc: null` não produz passaporte (defesa em profundidade);
expedição barra `doc: null` sem lançar. E uma guarda de fontes
(`onda32-resolvedor.test.ts`) que impede reintroduzir `seedFor`, os três NCMs
de exemplo, os nomes comerciais fabricados ou o `filter` sem checagem de nulo.

Um teste da Onda 31 falhou ao primeiro run — ele travava literalmente
`filter((r) => r.emitivel)`. Foi atualizado para a forma mais forte
(`!r.emitivel || !r.doc`), não removido.

---

## 4. Medição das três camadas (8ª, 05/11)

| Camada        | Estado                     | Evidência                                                                                                       |
| ------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 32** (este commit)  | `git ls-remote`                                                                                                 |
| App publicado | **Onda 29**, sem alteração | mesmo entry `index-1d8-RbIh.js`, 218 chunks; `DRE não apurável`, `cockpit-sem-ficha`, `gemeo-sem-ficha` = **0** |
| Banco         | **sem as migrações 21/24** | `PGRST205` na view, 3× `PGRST202` nas RPCs                                                                      |

O ar está **três ondas** atrás do repo (30, 31, 32). O banco não muda desde a
4ª medição. Publicar app não aplica SQL.

---

## 5. O que resta, medido

1. **O próximo risco real: o modelo _dentro_ da ficha salva.**
   `computeDigitalProductPassport` ainda faz
   `doc.etiquetagem ?? defaultEtiquetagemFor()` e
   `doc.encaixeCad ?? defaultEncaixeCadFor()`. Esses defaults são
   **Poliéster 96% / Elastano 4%** e **eficiência 88,3%** — composição e
   encaixe do exemplo. `seedFor()` os preenche, então uma ficha que é cópia do
   modelo com apenas o nome editado é `provenance === "salva"` e produz nota
   ESG, kg CO₂e e litros de água **do modelo**, exibidos na home. A Onda 28 já
   barra o _PDF_ sem NCM de 8 dígitos; falta levar esse veto para o próprio
   `computeDigitalProductPassport` e exigir composição declarada. Próxima onda.
2. **Seis painéis internos da ficha** ainda chamam `ensure()` dentro do seletor
   do Zustand (mutação no render). São componentes de edição; a Onda 22 rotula
   o resultado como `template`. Dívida arquitetural, não número operacional.
3. **`store.ts`** — ~20 updaters com `?? seedFor(ref)` como ponto de partida de
   edição; contrato travado por `materializacao.test.ts`.
4. **Vitrines declaradas** — `ai-agents.tsx` (copiloto), `research-gtm.ts`
   (`INITIAL_GTM_CAMPAIGNS`), `photorealism.ts` (NCM em prompt de imagem), e o
   placeholder de primeiro frame do cockpit (`seedFor` que **não grava**).
5. **Banco** — `docs/producao/APLICAR-ONDA-21-24.sql` continua esperando o SQL
   editor de `njmniwsqwohmigroswnl`.
