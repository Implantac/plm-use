# Relatório completo — o que ainda falta melhorar ou implementar

> **Data:** 06/11/2026 (56ª medição) · **Repo:** Onda 62 (`c68c2c1` + este
> relatório) · **Ar:** Onda 61 (`index-BOthbvNE.js`) · **Banco:** migrações
> 21/24 aplicadas · **Gates:** 783/783
>
> Este relatório lista **tudo** que ainda falta, com a medição que o
> sustenta. Nada aqui é especulação: cada item foi medido na fonte, no DOM
> ou no banco. Itens com o dono são os que só ele pode resolver (publicar,
> segredos de e2e).

---

## 1. Estado atual (56ª medição)

| Camada        | Estado                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Repositório   | **Onda 62** — HEAD local = remoto, working tree limpo, 787 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados |
| App publicado | **Onda 61** — `index-BOthbvNE.js` / `index-fT4j6Can.js`, 214 chunks / 3.199.677 bytes, 0 falhas                                      |
| Banco         | Migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                     |
| Gates         | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **783/783**                                                              |

**O que as Ondas 47–62 fecharam** (não regredir): vitrine não emite
documento (ficha cega, media kit, line sheet, MRP, CRP, coleções, guia de
bonificação); 0 campos sem nome acessível (Ondas 49/52/60/61); 0 avisos sem
saída (Onda 54); glossário em 20 rotas com 48 termos (Ondas 45/58/62);
`criarLote()` órfão removido; `/digital-twin` honesto sem ficha.

---

## 2. Pendências com o dono (não são código)

| #   | Pendência                                | Como resolver                                                                                                                                   |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Publicar a Onda 62** no Lovable        | Publicar o app. Não aplica SQL (já aplicado desde a 24ª). A 57ª medição valida por entry/bytes + cliques.                                       |
| D2  | **`PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`** | Definir os 2 segredos no GitHub Actions. Hoje os jobs `e2e-staging` e `e2e-autenticado` ficam `skipped` — é a única pendência que não é código. |

---

## 3. Código — o que falta melhorar (por risco)

### 3.1 Glossário nas 12 rotas com jargão restante → **Onda 63 (recomendada)**

20 das 44 rotas têm `GlossarioTermos`. Medição das 24 sem, por densidade de
siglas do glossário no texto visível:

| Rota                                                                                                                                                    | Siglas medidas                                 | Prioridade              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------- |
| **tech-sheet**                                                                                                                                          | 9 — ABNT, BOM, BOP, CAD, MRP, NCM, OP, PV, SKU | **Alta** (rota central) |
| **approvals**                                                                                                                                           | 5 — ABNT, BOM, BOP, CAD, POM                   | Alta                    |
| **research**                                                                                                                                            | 5 — ABNT, CAD, DPP, ESG, OTB                   | Alta                    |
| **digital-twin**                                                                                                                                        | 4 — BOM, BOP, MRP, PV                          | Alta                    |
| cad                                                                                                                                                     | 2 — BOM, CAD                                   | Média                   |
| catalog, flow, looks, measurements, prototypes, references, showroom                                                                                    | 1 cada                                         | Média                   |
| admin.users, ai-agents, ai-center, collection-map, collections.compare, colors, display, feed, official-models, pieces-report, prints, production.today | 0                                              | **Não precisam**        |

**Onda 63 sugerida:** `GlossarioTermos` nas 11 rotas com jargão
(tech-sheet, approvals, research, digital-twin + 7 de 1 sigla) → 31 rotas
com glossário. As 12 de 0 siglas não precisam — adicionar glossário vazio
seria ruído.

### 3.2 Siglas ainda fora do glossário

| Sigla | Ocorrências em texto visível | Contexto                                                                 |
| ----- | ---------------------------- | ------------------------------------------------------------------------ |
| B2B   | 15×                          | Vendas/comercial — jargão comum, mas opaco para o primeiro dia           |
| RLS   | 5×                           | Segurança (`security`) — técnico; a rota já tem glossário, falta o termo |
| RBAC  | 2×                           | Segurança — idem                                                         |

**Recomendação:** +3 termos (B2B, RLS, RBAC) na Onda 63, junto com 3.1.
`A4`, `PLM`, `IA`, `CSV`, `PNG`, `URL`, `CNPJ`, `UF` são conhecimento comum
e não precisam de glossário.

### 3.3 `DEV000006` — auditoria de declaração (47 ocorrências na fonte)

A ficha de demonstração aparece em 47 pontos da fonte (20 no bundle):
`SemFichaSalva.tsx`, `cad/store`, `techsheet/store`, `mrp`, `outsourcing-os`,
`cfo-dre`, `research-gtm`, `launch/omnichannel-readiness` e outros. As
Ondas 47–59 garantiram que ela é **declarada como vitrine** onde aparece
em documento/KPI, mas não houve uma auditoria ponta a ponta de **todas** as
superfícies onde `DEV000006` surge em tela.

**Recomendação:** onda de auditoria — varrer cada superfície com
`DEV000006` e confirmar selo "Demonstração" ou `—` com CTA. Risco: baixo
(as guardas já existem), mas é o último lugar onde dado de fábrica poderia
se passar por real.

### 3.4 `CollectionROI` — estimativa declarada

O ROI de coleção é uma **estimativa de referência declarada** (Onda 53),
não apuração. Está honesto, mas continua sendo número de fábrica em tela
de decisão.

**Recomendação:** quando houver lote real com venda apurada, trocar a
estimativa por apuração; até lá, manter o aviso. Não é defeito — é dívida
de dado, não de código.

### 3.5 `stock_reservation_aging.dias_ativa` — revisar

A view retorna `200 []` (correto: sem reservas ativas, vazia é o certo).
A coluna `dias_ativa` nunca foi exercitada com dado real.

**Recomendação:** criar uma reserva de teste, medir a view, e só então
decidir se precisa de ajuste. **Não escrever migration sem essa medição.**
Publicar o app não aplica SQL — qualquer mudança aqui exige o roteiro
Lovable/SQL Editor das Ondas 21–24.

### 3.6 Mock no cron de performance de lançamento

`src/routes/api/public/cron/launch-performance.ts:39` — "Snapshot mock de
sell-through (TODO: substituir por ErpAdapter.getSellThrough)". É o único
`TODO` real na fonte (os outros 5 são falsos positivos de `"TODOS"`).

**Recomendação:** ligar ao `ErpAdapter` quando o ERP existir; até lá,
confirmar que o snapshot mock é rotulado como tal na tela que o consome.
O PLM deliberadamente não é ERP — este mock é a fronteira.

### 3.7 Higiene de código (medido, sem ação urgente)

| Medida                                        | Resultado                                  |
| --------------------------------------------- | ------------------------------------------ |
| `TODO`/`FIXME`/`HACK` reais                   | 1 (o do cron, §3.6)                        |
| `console.log` em `src/` (fora de teste)       | **0**                                      |
| `eslint` warnings                             | 20 (fast-refresh, pré-existentes, 0 erros) |
| Arquivos `100644`                             | 787 (nenhum executável indevido)           |
| Token em `.git/config` / arquivos versionados | **0 / 0**                                  |

---

## 4. O que NÃO falta (fechado e provado)

| Área                                            | Estado                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| Campos sem nome acessível                       | **0 reais** (Ondas 49/52/60/61)                |
| Emissores de documento sem guarda               | **0** (varredura das Ondas 47–59)              |
| Avisos sem saída (CTA)                          | **0 rotas** (Onda 54)                          |
| Vitrine emitindo guia fiscal / ROI / ROAS / CAC | **0** (Onda 59)                                |
| `criarLote()` órfão                             | Removido (Onda 57)                             |
| `/digital-twin` sem ficha                       | Honesto com `<h1>`, KPIs `—`, 2 CTAs (Onda 56) |
| Banco (view + 4 funções)                        | Aplicado e inalterado desde a 24ª              |
| SQL `APLICAR-ONDA-21-24.sql`                    | SHA `382f0f19…`, 474 linhas, intacto           |

---

## 5. Priorização recomendada

1. **D1** — publicar a Onda 62 (dono, 1 clique).
2. **Onda 63** — glossário nas 11 rotas com jargão + B2B/RLS/RBAC (§3.1–3.2).
   É a maior lacuna de usabilidade restante e segue o padrão provado das
   Ondas 58/62.
3. **D2** — segredos de e2e (dono) — destrava a cobertura ponta a ponta.
4. **Auditoria `DEV000006`** (§3.3) — última varredura de honestidade de dado.
5. **Cron mock** (§3.6) e **`dias_ativa`** (§3.5) — quando houver dado real
   para medir.
6. **`CollectionROI`** (§3.4) — quando houver venda apurada.

> Regra permanente: nenhuma onda relaxa asserção antiga; publicar o app não
> aplica SQL; marco relatado é re-medido antes de virar fato.
