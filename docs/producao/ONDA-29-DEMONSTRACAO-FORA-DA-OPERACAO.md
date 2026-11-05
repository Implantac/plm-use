# Onda 29 — O modelo de demonstração sai das telas de operação

**Data:** 05/11/2026 · **Antecessor:** `d617166`

---

## 1. O que sobrou depois das Ondas 27 e 28

As duas ondas anteriores fecharam o **documento** (27) e o **preço/NCM** (28). O
`?? seedFor(...)` continuava vivo em telas onde ele não imprime nada — mas
**decide**: cotação com fornecedor, requisição de compra, catálogo B2B.

Auditoria de todos os `seedFor(` restantes em código de produção:

| Onde                             | Virava                                           | Gravidade |
| -------------------------------- | ------------------------------------------------ | --------- |
| `supplier-portal` (RFQ)          | OC impressa + preço de fornecedor gravado na BOM | **alta**  |
| `mrp-explosion`                  | requisição de compra de insumo                   | **alta**  |
| `showroom`                       | ordem B2B com preço de atacado                   | **alta**  |
| `display`                        | quadro de displayagem com preço                  | média     |
| `mrp.ts` `findMaterialWhereUsed` | "onde usado" listando demo                       | média     |
| `prints`                         | fallback morto (ref só vem de ficha salva)       | nenhuma   |

## 2. Portal do fornecedor (RFQ)

Era o pior: `base = ["DEV000006","V24-001","U25-014","I25-088"]` oferecia as
quatro referências de exemplo no seletor de RFQ; `doc = sheetsMap[sel] ?? seedFor(sel)`
explodia o BOM de demonstração; e **"Adjudicar" gravava preço e fornecedor na
BOM** daquela referência, com `ensure()` materializando o modelo. Depois,
"Emitir OC A4" imprimia a ordem de compra.

Agora:

- `availableRefs` = `operationalCodes(sheetsMap, [], materializadas)` — só ficha salva;
- seleção automática da primeira ficha válida (`useEffect`), nunca uma ref fixa;
- `doc` é `sheetsMap[selectedRef]` ou `undefined` — **sem seed**;
- com zero fichas, o painel inteiro é substituído por um cartão explicando o que
  fazer (teste: `rfq-sem-ficha`);
- `awardWinner` e `printOc` exigem `doc`;
- o `<select>` mostra `sheetsMap[r]?.meta?.name`, não mais um nome semeado.

## 3. MRP (`mrp-explosion.ts`)

`params.sheets[order.refCode] ?? seedFor(order.refCode)` transformava pedido sem
ficha em necessidade de compra. Agora o pedido **sai da explosão** e é
reportado:

```ts
MrpSummary.pedidosSemFicha: string[]
```

O painel (`MrpNetExplosionPanel`) mostra, em bloco vermelho, quantos pedidos
ficaram fora e quais — junto do aviso de procedência de saldo que já existia.

## 4. Showroom

- catálogo = `Object.keys(sheetsMap)` ordenado, com `sheetProvenance` por item
  (antes plantava as 4 refs e usava `isCustomized = refCode === "DEV000006"`);
- `buildShowroomCatalogItem(ref, doc, provenance)` só precifica
  `provenance === "salva"`; sem ela, `wholesaleUnitPrice` e
  `suggestedRetailPrice` são `null` — inclusive o **multiplicador do preset**
  deixou de entrar na conta;
- linha de pedido com preço `null` não entra em `orderLines`;
- `fmtBrl(null)` → `—`; estado vazio quando não há ficha.

## 5. Display e "onde usado"

- `display`: sem plantar `DEV000006` e sem `?? seedFor`; `price … || 149` virou
  `|| 0` (a tela mostra `R$ 0` em vez de R$ 149 inventados).
- `mrp.ts findMaterialWhereUsed`: o mapa plantado `{ DEV000006: seedFor(...) }`
  saiu — "onde usado" de um material não lista mais ficha de demonstração.

## 6. Um teste instável que não era estável

`OrderDetail.test.tsx` → "custo corrige consumo de um material" falhava em
**~metade** das rodadas (antes: "some na próxima"). Causa encontrada: o teste
esperava `api.updateMaterial` ser **chamado**, não o salvamento **resolver**; o
clique seguinte é _toggle_ (`if (editMatId === m.id) setEditMatId(null)`), então
às vezes fechava o editor em vez de abrir e "Remover material" sumia.

Correção no teste (o componente está correto): esperar o editor fechar
(`Salvar material` ausente) antes de reabrir. **5 rodadas seguidas: 15/15.**

## 7. Gates

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **409/409** (eram 407)             |

Testes novos: showroom não precifica referência/template (2 asserções de preço
`null`); MRP com zero fichas devolve `rows: []` e `pedidosSemFicha` completo, e
com uma ficha só ela entra.

## 8. O que continua de fora (honestidade sobre o resto)

- **`development.tsx`** ainda usa `seedFor(code)` como `doc` de cartões de
  referência que existem no banco mas não têm ficha. É _exibição_, não decisão —
  mas o cartão mostra BOM/números do modelo. Candidato à Onda 30.
- **`cutting-room`, `fabric-rolls`, `measurements`, `route-engineering`** usam
  `sheetsMap[r] ?? seedFor(r)` só para o **nome** no `<option>` — se a ref está
  na lista, está no mapa; o fallback é inalcançável. Limpeza cosmética.
- **`ai-agents.tsx` / `OmnichannelReadinessPanel`** montam mapas com
  `seedFor` como ponto de partida. O painel de omnichannel já avalia só o que
  recebe; o mapa é contexto de demonstração da tela de agentes.
- **`photorealism.ts`** cita NCM default dentro de prompt de imagem — não é
  documento.
