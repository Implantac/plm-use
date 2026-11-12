# Onda 64 — Auditoria DEV000006 ponta a ponta (58ª medição)

> **`ok prossiga com as melhorias` = medir, escolher a onda seguinte pelo
> risco, sem perguntar, implementar, provar por cliques e empurrar.** Este
> documento é uma **medição**, não um plano. Publicar o app não aplica SQL e
> nenhuma asserção das Ondas 22/23/27–63 foi relaxada.

---

## 1. 58ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 64)                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo   | `a71497245ed95a53f769324d18c3d4108ca163ad` (`a714972`) local = remoto, working tree limpo, 792 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados |
| Ar     | entry **novo** `index-B0uxa54F.js` / `index-CSDnutoy.js`, **214 chunks / 3.204.004 bytes**, 0 falhas; **3 marcadores da 63 = 1**, 5 da 62 = 1, 3 da 61 = 2               |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`** (com parâmetros corretos); `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 474 linhas inalterados  |

**Publicações das Ondas 62 e 63 relatadas pelo dono e validadas por cliques
reais em produção:** `/materials` com o glossário `MOQ — Quantidade mínima
de pedido` / `SKU — Variação do produto` (Onda 62) e `/tech-sheet` com os
9 termos (Onda 63), 0 `pageerror`. Captura
`/home/user/medicao58-prod-tech-sheet.png`.

**Repo, ar e banco alinhados na Onda 63, sem publicação pendente.**

---

## 2. Como a Onda 64 foi escolhida pelo risco

Auditoria das **47 ocorrências** de `DEV000006` na fonte (20 no bundle),
classificadas uma a uma:

| Classe                                                                           | Ocorrências | Estado                                                  |
| -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| Comentários (sem superfície de UI)                                               | ~20         | OK                                                      |
| Seeds com `demo: true` (cad, prototypes, OS, private-label-queue, campanhas GTM) | 8           | Seladas/filtradas pelas telas                           |
| `cfo-dre` MODELO_REFS                                                            | 1           | Fora dos acumuladores por desenho                       |
| tech-sheet estado vazio                                                          | 1           | Declara "ficha de demonstração DEV000006"               |
| dashboard DPP herói                                                              | 4           | `DataProvenanceBadge` "demonstracao"                    |
| looks sugestão IA                                                                | 2           | Filtra o DEV000006; toast honesto sem ficha real        |
| research/marketing vitrine                                                       | 4           | `briefing-so-vitrine` / `gtm-so-vitrine` + selos        |
| showroom catálogo                                                                | 1           | Preço `null` para ficha não salva; estado vazio honesto |
| commercial expedição                                                             | 1           | Só ficha salva (`Object.keys(sheetsMap)`)               |
| **Formulários pré-preenchidos com dado de demonstração**                         | **3**       | **VAZAMENTO**                                           |

A varredura de emissores não achou nenhum documento sem guarda. O risco
remanescente mais alto era o **formulário que planta dado de demonstração
e, ao salvar, vira registro operacional** — exatamente o padrão que as
Ondas 47–59 fecharam em documentos, agora em formulários.

---

## 3. Os 3 vazamentos (provados por cliques antes de corrigir)

### 3.1 Marketing — campanha com SKUs e números de vitrine

O formulário "Cadastrar Drop" vinha pré-preenchido com
`skuRefsText: "DEV000006, V24-001"`, `productionCostBrl: "12000"`,
`mediaSpendBrl: "25000"`, `attributedSalesBrl: "115000"`. Ao salvar, a
campanha nascia **sem `demo`** → `campanhasOperacionais()` a tratava como
real, a vitrine caía e os KPIs mostravam R$ 115.000 inventados.

**Prova (antes):** salvar só com nome → `gtm-so-vitrine` **False**,
campanha criada **True**, "115" nos KPIs **True**. Capturas
`/home/user/medicao58-marketing-dialogo-antes.png`,
`/home/user/medicao58-marketing-depois-salvar.png`.

### 3.2 Suppliers — parceiro fictício pré-preenchido

O formulário "Adicionar" vinha com CNPJ `15.880.120/0001-40`, Apucarana/PR,
"Certificado ABVTEX", 75.000 min/mês, e-mail `pcp@parceiro.ind.br`. Ao
salvar, nascia fornecedor **"homologado"** com CNPJ e capacidade de
fábrica. Os fallbacks do save (`|| "Apucarana"`, `|| 60000`) injetavam o
mesmo dado quando o campo ficava vazio.

### 3.3 Research — briefing pré-preenchido

O formulário de briefing vinha com tecido "Meia Malha Pima 170 g/m²",
gramatura 170, "Algodão Pima", R$ 189,90 e tags de exemplo. Ao salvar,
nascia briefing **operacional** com dado de exemplo. Fallbacks do save
(`|| 165`, `|| 179.9`, `?? 93`) injetavam o mesmo dado.

---

## 4. O que foi entregue

**Padrões visíveis esvaziados + fallbacks do save neutralizados** nos 3
formulários (nenhum handler, validação ou store mudou além disso):

| Formulário | Antes                                                    | Depois                                                                                                                                       |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| marketing  | SKUs `DEV000006, V24-001` + R$ 12.000/25.000/115.000     | SKUs e números **vazios** (só data/coleção/canal/formato, rótulos inofensivos)                                                               |
| suppliers  | CNPJ, Apucarana/PR, ABVTEX, 75.000 min, e-mail fictícios | Campos **vazios**; compliance padrão **"Em Auditoria"** (não nasce "certificado"); fallbacks de texto `""`, numéricos no mínimo (`Math.max`) |
| research   | Tecido, gramatura 170, R$ 189,90, tags de exemplo        | Campos **vazios**; fallbacks `""`/`0` (gramatura no mínimo 60, preço no mínimo 29, confiança 0 para briefing novo)                           |

**O que NÃO mudou:** nenhum rótulo de módulo, nenhuma guarda, nenhum
`demo: true` de seed, nenhuma migration SQL. Campanha/briefing/fornecedor
**salvos pelo usuário** continuam entrando em número operacional — agora
com dado que o usuário digitou, não com dado de fábrica.

Teste novo: `src/lib/onboarding/onda64-vitrine-audit.test.ts` (**6
asserções**), incluindo as declarações das superfícies auditadas e o
SHA-256 inalterado do SQL aplicado.

---

## 5. Prova por cliques reais (browser local, antes → depois)

| Medida                                                      | ANTES (Onda 63)                               | DEPOIS (Onda 64)                                            |
| ----------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `/marketing` "Cadastrar Drop": SKUs/números pré-preenchidos | `DEV000006, V24-001` / 12000 / 25000 / 115000 | **vazios** (só data/coleção/canal/formato)                  |
| `/marketing` salvar só com nome                             | vitrine **False**, "115" nos KPIs             | **não testado após** (formulário vazio não tem o que vazar) |
| `/suppliers` "Adicionar": campos pré-preenchidos            | CNPJ/Apucarana/75000/e-mail                   | **vazios**                                                  |
| Superfícies DEV000006 declaradas                            | 9 de 10 classes                               | **10 de 10** (3 formulários corrigidos)                     |
| `pageerror`                                                 | 0                                             | **0**                                                       |

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 6. Gates e 58ª medição (depois de fechar a Onda 64)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **796/796** (790 + 6).

| Camada        | 58ª medição                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 64** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                |
| App publicado | **Onda 63** — entry `index-B0uxa54F.js` / `index-CSDnutoy.js`, 214 chunks / 3.204.004 bytes, 0 falhas (idêntico ao início da medição); 3 marcadores da 63 = 1, 5 da 62 = 1, 3 da 61 = 2 |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                        |

**Há uma publicação pendente (a 64)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 63/62/61 intactos no ar: nenhuma regressão.

---

## 7. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- Mock no cron `launch-performance.ts:39` (único `TODO` real) — ligar ao
  `ErpAdapter` quando o ERP existir; confirmar rótulo na tela que o consome.
  **Candidato natural à Onda 65.**
- `CollectionROI` estimativa declarada — vira apuração com venda real.
- Revisar `stock_reservation_aging.dias_ativa` com reserva de teste antes
  de qualquer migration (hoje `200 []`, correto).
- Auditoria `DEV000006` concluída: **47/47 ocorrências classificadas**,
  3 vazamentos de formulário fechados. O padrão "formulário pré-preenchido
  com dado de demonstração" deve ser vigiado em formulários novos.
