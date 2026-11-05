# Onda 33 — A nota ESG não vem do modelo

**Data:** 05/11/2026 · **Antecessor:** `f1b8169` (Onda 32 + docs)

---

## 1. O furo que sobrava dentro da ficha salva

A Onda 28 tirou o **NCM** do default, e a Onda 32 fez `ResolvedRef.doc` virar
`null` quando não há ficha. Mas ainda havia um caminho em que o modelo aparecia
**por dentro de uma ficha considerada salva**:

```ts
// store.ts — default de demonstração (Onda 28 esvaziou só ncm e paisOrigem)
defaultEtiquetagemFor() => {
  composicao: [{ fibra: "Poliéster", pct: 96 }, { fibra: "Elastano", pct: 4 }],
  ncm: "", paisOrigem: "", ...
}
defaultEncaixeCadFor() => { eficienciaPct: 88.3, ... }

// seedFor() preenche os dois. dpp-expedition.ts (antes):
const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
...
origin: etq.paisOrigem || "Feito no Brasil",
```

`seedFor()` entrega composição e encaixe **do exemplo**. Então uma ficha que é
cópia do modelo com **só o nome editado** vira `provenance === "salva"`
(Onda 22: primeira edição promove), e `computeDigitalProductPassport` calculava
nota ESG, kg CO₂e, litros de água e circularidade sobre **Poliéster 96% /
Elastano 4%** e **88,3% de encaixe** — declarando ainda "Feito no Brasil" sem
origem informada. A home exibia `Rating A · 0,42 kg CO₂e` como se fosse do
produto da empresa.

`buildDppPrintableHtml` barrava o **PDF** sem NCM (Onda 28), mas o _objeto_ DPP
já existia e alimentava home, painel de passaportes, media kit e QR.

---

## 2. O veto entra no cálculo

Nova função pura e exportada, `dppRequirements(ref)`:

| Pendência        | Exigência                                           |
| ---------------- | --------------------------------------------------- |
| `sem-ficha`      | `emitivel && doc !== null` (Onda 32)                |
| `sem-ncm`        | exatamente **8 dígitos**, sem pontuação de exibição |
| `sem-origem`     | `paisOrigem` declarado (não "Feito no Brasil")      |
| `sem-composicao` | composição ABNT não-vazia                           |
| `sem-encaixe`    | `encaixeCad` presente                               |

`computeDigitalProductPassport` chama `dppRequirements` **antes** de qualquer
fator LCA. Saíram todos os `?? defaultEtiquetagemFor()` /
`?? defaultEncaixeCadFor()`, o `|| "Feito no Brasil"` e o ramo
`"Composição não informada na ficha"`. `origin` agora é o valor da ficha.

Alinhamentos:

- `buildDppPrintableHtml` passou de "NCM não-vazio" para **8 dígitos**.
- `computePackingAndNfePreview` passou de `length < 8` (aceitava 9+) para
  `length !== 8`, mesmo critério do DPP e da Onda 28.
- `DppPassportPanel` deixou de dizer apenas "modelo"/"demonstração" e passou a
  listar as **pendências objetivas** (`DPP_PENDENCIA_LABEL`) — uma ficha salva
  sem NCM agora diz "NCM de 8 dígitos · país de origem declarado".
- A home mostra as pendências no lugar de "Sem ficha salva: o passaporte não é
  emitido", que era falsa quando a ficha existia mas estava incompleta.
- O media kit GTM nomeia os requisitos no estado vazio.

---

## 3. Por que não esvaziamos o default no `store.ts`

`defaultEtiquetagemFor()` é usado por **10 módulos**, entre eles o gate
omnichannel, que exige `composicao.length > 0` para pontuar
`hasCareLabelAbnt`. Esvaziar a composição no default faria toda ficha nova
nascer reprovada no gate — e quebraria testes que afirmam o comportamento. É o
mesmo erro já registrado na Onda 28: _todo default que sai do modelo quebra os
testes que o afirmavam_.

A correção foi feita no **consumidor que produz o número questionável**, com
regras objetivas e auditáveis. A limpeza do seed continua registrada como dívida
(Onda 34), com a medição dos 10 consumidores a revisar.

**Limite honesto:** uma ficha salva que preencha NCM e origem mas mantenha a
composição/encaixe exatamente iguais aos do modelo ainda passa. Os dois campos
fiscais vazios no default são o que barra o caso concreto (cópia do modelo com
nome editado); a distinção definitiva entre "declarado" e "semeado" exige mexer
no `store.ts`.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **481/481** (eram 471)             |

Testes novos (10): cópia do modelo → `sem-ncm` + `sem-origem` e DPP `null`;
nome editado não basta; NCM de 7 dígitos é veto; composição/encaixe ausentes
barram **sem usar defaults**; DPP completo declara a origem real; pendência
`sem-ficha` é objetiva; e 4 guardas de fonte (`onda33-dpp.test.ts`) contra
reintroduzir `defaultEtiquetagemFor()`, `"Feito no Brasil"` ou o rótulo
genérico "demonstração".

Dois testes antigos mudaram de **fixture**, não de exigência: o DPP e o media
kit agora usam ficha com NCM e origem declarados. O teste do media kit ganhou
uma asserção nova — `seedFor()` puro **não** produz mais `CO₂e` no HTML.

---

## 5. Medição das três camadas (9ª, 05/11)

| Camada        | Estado                     | Evidência                                                                                                      |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 33** (este commit)  | `git ls-remote`                                                                                                |
| App publicado | **Onda 29**, sem alteração | mesmo entry `index-1d8-RbIh.js`, 218 chunks; `DRE não apurável`, `cockpit-sem-ficha`, `dpp-sem-ficha` (legado) |
| Banco         | **sem as migrações 21/24** | `PGRST205` na view, 3× `PGRST202` nas RPCs                                                                     |

O ar está **quatro ondas** atrás do repo (30, 31, 32, 33). O banco não muda
desde a 4ª medição. Publicar app não aplica SQL.

---

## 6. O que resta

1. **`store.ts` / `seedFor()`** — ainda semeia composição e encaixe do modelo em
   toda ficha nova. Correção raiz: parar de preencher esses dois campos e
   revisar os 10 consumidores de `defaultEtiquetagemFor()` (incluindo o gate
   omnichannel). Medido, não feito.
2. **Seis painéis internos da ficha** com `ensure()` dentro do seletor do
   Zustand — dívida arquitetural, sem número operacional.
3. **Vitrines declaradas** — `ai-agents`, `INITIAL_GTM_CAMPAIGNS`,
   `photorealism`, placeholder de primeiro frame do cockpit.
4. **Banco** — `APLICAR-ONDA-21-24.sql` esperando o SQL editor de
   `njmniwsqwohmigroswnl`.
5. **Publicar** as Ondas 30–33 no Lovable.
