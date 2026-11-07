# Onda 41 — A trilha LGPD não contém ficção

**Data:** 06/11/2026 · **Commit:** `334d672` · **Antecessor:** `13f6961` (Onda 40 + docs)

---

## 1. O ar segue parado — e a medição achou a prova do furo

A 18ª medição confirmou o **mesmo** `index-BcTzKh6M.js` (221 chunks) pela
segunda rodada seguida: `sop-sem-pedidos` e `sop-sem-faccao` = 0, as Ondas 39 e
40 **não foram publicadas**. Mais grave, o bundle publicado contém:

```
"Helena Prado"                 1 vez
"Aprovou matriz de setup"      1 vez
"Trilha LGPD não auditável"    0
```

Ou seja: **o app no ar exporta, em CSV e no Relatório de Governança A4,
eventos de auditoria com atores, aprovações e bases legais inventados**. Não é
uma suspeita sobre o código — é o texto presente no bundle servido ao usuário.

| Camada        | 17ª medição                   | **18ª medição**                                      |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| Repositório   | Onda 40                       | **Onda 41** (este commit)                            |
| App publicado | Onda 38 (`index-BcTzKh6M.js`) | **Onda 38**, sem alteração                           |
| Banco         | sem migrações 21/24           | **sem migrações 21/24** — `PGRST205` + 3× `PGRST202` |

O repo está **três ondas** à frente do ar (39, 40, 41). `DEV000006` segue em
**27** ocorrências. O banco não muda desde a 4ª medição.

---

## 2. O que foi medido

```
INITIAL_GOVERNANCE_EVENTS = 4 eventos de fábrica
  "Helena Prado" · engenharia_custo ·
  "Aprovou matriz de setup e margem do pedido B2B PD-2026-802" ·
  "Execução de Contrato" · 2026-11-03
  (+ "Marcos Viana" importando lista nominal de 8 atletas, "Facção Costura Fina"...)

buildLgpdAuditCsv(...)               → CSV com as 4 linhas
buildRbacGovernanceHtmlReport(...)  → A4 "Trilha Recente de Auditoria & LGPD"
security.tsx                        → KPI "Trilha LGPD: 4 eventos"
```

Eram **registros de conformidade fabricados** — nomes de pessoas, aprovações de
margem e bases legais LGPD que nunca aconteceram — num documento que pode ser
baixado e apresentado a um auditor. É o resíduo mais grave da série: não é só
um número enganoso, é uma **evidência falsa**.

No mesmo levantamento, os 4 briefings de fábrica (`targetPriceBrl` 229,90 /
289,90 / 169,90 / 259,90 e `confidencePct` 95/92/94/89) geravam
`avgConfidence = 92,5%`, exibido como **"Aderência Comercial · 92% · score
tendência"** — um score de IA apresentado como análise real, sem nenhum selo.

---

## 3. O que mudou

### `rbac-governance.ts`

`GovernanceAuditEntry` ganhou `demo?: boolean`; os 4 eventos de fábrica foram
marcados (**não apagados** — continuam na tela com selo "Demonstração").
Entraram `EVENTO_DEMO_LABEL` e `eventosAuditaveis()`.

- `buildLgpdAuditCsv` **filtra internamente**: com só vitrine devolve apenas o
  cabeçalho, sem nenhuma linha de ficção.
- `buildRbacGovernanceHtmlReport` filtra e, sem eventos reais, imprime aviso
  âmbar `Trilha LGPD não auditável` em vez de uma tabela vazia.
- `recordAuditEvent` e `runRestoreDrill` já criavam eventos sem `demo` —
  registrar uma ação real torna a trilha auditável imediatamente.

### `security.tsx`

KPI "Trilha LGPD" → `—` / "sem eventos auditáveis". Os botões **Exportar CSV
LGPD** e **Relatório A4** são bloqueados com `toast.error` quando não há evento
real (não exportam um arquivo vazio com cara de trilha). Aviso
`lgpd-so-vitrine` no topo e selo âmbar em cada linha de demonstração.

### `research-gtm.ts` + `research.tsx`

`BriefingInsight.demo?` nos 4 iniciais, `BRIEFING_DEMO_LABEL` e
`briefingsOperacionais()`. `avgConfidence` passa a ser `null` quando só há
vitrine, e o KPI "Aderência Comercial" mostra `—` / "score não apurável".
Aviso `briefing-so-vitrine`, selo nos cards e KPI de briefings com `—`.

`upsertBriefing` passou a **promover explicitamente** o briefing editado. O
mesmo foi feito em `upsertCampaign`: a Onda 38 dependia de o formulário não
reenviar `demo`, o que funcionava mas era implícito — agora é uma regra
declarada.

### Fixtures, não afrouxamento

`src/test/governanca-e-briefings.ts` fornece `eventosSalvos()` e
`briefingsSalvos()`. `rbac-governance.test.ts` foi **migrado** e continua
exigindo `"engenharia_custo"` e `"Lista Nominal por Peça"` no CSV. Nenhuma
asserção antiga foi removida ou relaxada.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **574/574** (eram 562)             |

**12 testes novos** (`onda41-lgpd.test.ts`): os 4 eventos marcados;
`eventosAuditaveis` e mistura; CSV de vitrine com **1 linha** e sem
`"Helena Prado"`/`"PD-2026-802"`; A4 com aviso e sem os atores de papel; com
`eventosSalvos()` CSV e A4 continuam apurando; registrar evento real torna a
trilha auditável; os 4 briefings marcados e o score 92,5 de papel;
`briefingsOperacionais`; edição de briefing **e** de campanha remove o selo;
e guardas de fonte nos emissores de conformidade e nas duas telas.

---

## 5. Estado e o que resta

Repo **Onda 41**, ar **Onda 38** (**três ondas** atrás: 39, 40, 41), banco
**sem as migrações 21/24**. Enquanto não republicar, o app no ar continua
exportando a trilha LGPD fictícia, 656 peças de facção e R$ 9.867,20 de
carteira B2B de papel.

Resíduos medidos:

1. **`ensure()`** — última ação capaz de plantar engenharia de papel. Sem
   chamadores em produção desde a Onda 35; `materializadas`/`provenance` já
   filtram suas fichas em todos os números. ~15 testes exercitam essa defesa.
2. **`INITIAL_PARTNERS`** (4 facções) alimenta `computePartnerMetrics` com
   scores e tiers de qualificação de fornecedor inventados — próximo candidato.
3. **`DEV000006` 27× no ar** — `photorealism`, placeholders de primeiro frame.
4. **Banco** (`APLICAR-ONDA-21-24.sql`, 3 NOTICEs), **publicar 39+40+41** e
   **credencial de e2e** seguem com o dono.
