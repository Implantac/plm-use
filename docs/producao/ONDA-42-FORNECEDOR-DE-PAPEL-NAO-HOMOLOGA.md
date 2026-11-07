# Onda 42 — Fornecedor de papel não homologa nem assina documento

**Data:** 06/11/2026 · **Commit:** `7b11535` · **Antecessor:** `fce26d0` (Onda 41 + docs)

---

## 1. O ar voltou a avançar — três ondas de uma vez

Depois de duas rodadas paradas, a 19ª medição encontrou um **novo** entry:
**`index-HH9GNbDa.js`**, 221 chunks.

| Marcador no bundle                              | Ocorrências | Leitura                   |
| ----------------------------------------------- | ----------- | ------------------------- |
| `sop-sem-pedidos`                               | 1           | Onda 39 publicada         |
| `sop-sem-faccao`                                | 1           | Onda 40 publicada         |
| `lgpd-so-vitrine` / `briefing-so-vitrine`       | 1 / 1       | Onda 41 publicada         |
| `supplier-so-vitrine` / `scoreboard-so-vitrine` | **0 / 0**   | Onda 42 **não** publicada |

As Ondas **39, 40 e 41 chegaram ao ar juntas**, sem aviso do dono — exatamente o
padrão das rodadas 14–16. A distância caiu de três ondas para **uma**.

| Camada        | 18ª medição                   | **19ª medição**                                      |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Repositório   | Onda 41                       | **Onda 42** (este commit)                            |
| App publicado | Onda 38 (`index-BcTzKh6M.js`) | **Onda 41** (`index-HH9GNbDa.js`)                    |
| Banco         | sem migrações 21/24           | **sem migrações 21/24** — `PGRST205` + 3× `PGRST202` |

`"Helena Prado"` segue **1 vez** no bundle, e isso é **esperado**: a Onda 41
não apagou a vitrine, apenas tirou esses eventos do CSV e do A4 e acrescentou
selo/aviso. `"Certificado ABVTEX"` aparece **8 vezes**, o CNPJ
`19.840.220/0001-31` e `"Facção Costura Fina Vale"` 1 vez cada — a vitrine de
fornecedores ainda não tem nenhuma declaração no ar. `DEV000006` segue em
**27** ocorrências. O banco não muda desde a 4ª medição.

---

## 2. O que foi medido

```
INITIAL_PARTNERS = 4 facções de fábrica
  "Facção Costura Fina Vale" · CNPJ 19.840.220/0001-31 ·
  "Certificado ABVTEX" · quality 95 / otif 93 / cost 88 / reliab 94
computePartnerMetrics → overallScore 93 · tier A+
  → ranking "93/A+ > 92/A+ > 90/A+ > 88/A" no SupplierScoreboard
  → suppliers.tsx: "Parceiros Ativos: 4 · homologados", "OTIF Médio: 90%"
  → buildRemessaNfeXml400 / buildBlindServiceOrderHtml podiam sair com
    CNPJ e certificação de um fornecedor que não existe
```

Eram **CNPJs, certificações ABVTEX e scores de qualificação inventados**,
ordenando um ranking de homologação e podendo assinar um XML de NF-e de
remessa (CFOP 5901/6901) e uma Guia OS Cega A4. Mesma família do furo da
Onda 41: dado de fábrica com cara de evidência.

`allocatedMinutes`, `piecesInPossession`, `openOrdersCount` e
`capacityUtilizationPct` **já eram 0** — as Ondas 27/32 tinham removido o
`seedFor` da ficha usada no cálculo. O que sobrava era o `overallScore`/`tier`,
que vinha direto dos scores do próprio parceiro, sem passar por nenhuma ficha.

---

## 3. O que mudou

### `outsourcing-os.ts`

`IndustrialPartner` ganhou `demo?: boolean`; os 4 parceiros de fábrica foram
marcados (**não apagados**). Entraram `PARCEIRO_DEMO_LABEL`,
`parceirosOperacionais()` e `promoverParceiro()`.

`ComputedPartnerMetrics` ganhou `apuravel: boolean`. `computePartnerMetrics`
recusa apurar um parceiro demo: devolve `apuravel: false` com os campos
zerados por baixo — e **nenhuma tela lê esses zeros**. `upsertPartner`
promove o parceiro editado a cadastro real, mesma regra das Ondas 38–41.

### `suppliers.tsx`

`avgOtif` passa a ser `null` quando só há vitrine. KPIs "Parceiros Ativos" →
`—` / "só demonstração" (em vez de "4 homologados") e "OTIF Médio" → `—` /
"não apurável". Aviso `supplier-so-vitrine`, selo "Demonstração" no card,
score `—` e o badge de compliance passa a dizer "Certificação de
demonstração".

### `SupplierScoreboard.tsx`

Badge "N parceiros auditados" → `—` e aviso `scoreboard-so-vitrine`. As
células de Qualidade AQL, OTIF, Custo e Confiabilidade e a coluna Score/Tier
imprimem `—` quando `!m.apuravel`; a linha de compliance declara a vitrine.
`tierStyle` só é aplicado a tiers apuráveis.

### `OutsourcingServiceOrderPanel.tsx`

`bloqueiaDocumento()` — que já vetava fichas sem engenharia salva (Ondas
30/33) — passou a vetar também `row.partner.demo === true`, bloqueando **tanto
o XML de remessa quanto a Guia A4** com `toast.error` explicando que o CNPJ e
a certificação não são reais.

### Fixtures, não afrouxamento

`src/test/parceiros-salvos.ts` fornece `parceirosSalvos()`.
`outsourcing-os.test.ts` foi **migrado** e continua exigindo
`overallScore >= 90`, `tier "A+"`, `176 peças`, os CFOPs 5901/5902/5124 e
6901/6902/6124, e o XML `<infNFe versao="4.00">` com `<CST>50</CST>`.
Nenhuma asserção antiga foi removida ou relaxada.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **586/586** (eram 574)             |

**12 testes novos** (`onda42-fornecedores.test.ts`): os 4 parceiros marcados
com CNPJ/certificação; os scores que geravam `93 > 92 > 90 > 88`;
`parceirosOperacionais` e mistura; `computePartnerMetrics` recusando apurar
demo; com `parceirosSalvos()` o `>= 90`/`A+` continua; `upsertPartner`
promove; guardas de fonte nas 4 telas/motores; bloqueio de XML e A4 **antes**
do emissor; fixture preservando CNPJ e scores; e nenhuma tela exibindo
`overallScore` sem checar `apuravel`.

---

## 5. Estado e o que resta

Repo **Onda 42**, ar **Onda 41** (**uma onda** atrás), banco **sem as
migrações 21/24**. Republicar é simples e fecha a última vitrine de
fornecedores; o banco continua sendo a camada mais atrasada.

Resíduos medidos:

1. **`ensure()`** — última ação capaz de plantar engenharia de papel. Sem
   chamadores em produção desde a Onda 35; `materializadas`/`provenance` já
   filtram suas fichas em todos os números. ~15 testes exercitam essa defesa.
   É dívida de código morto, não um número no ar.
2. **`DEV000006` 27× no ar** — `photorealism`, placeholders de primeiro frame.
3. **Banco** (`APLICAR-ONDA-21-24.sql`, 3 NOTICEs), **publicar a Onda 42** e
   **credencial de e2e** seguem com o dono.
