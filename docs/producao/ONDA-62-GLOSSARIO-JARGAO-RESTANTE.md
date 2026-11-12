# Onda 62 — Glossário cobre o jargão que a UI usa (56ª medição)

> **`ok prossiga com as melhorias` = medir, escolher a onda seguinte pelo
> risco, sem perguntar, implementar, provar por cliques e empurrar.** Este
> documento é uma **medição**, não um plano. Publicar o app não aplica SQL e
> nenhuma asserção das Ondas 22/23/27–61 foi relaxada.

---

## 1. 56ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 62)                                                                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo   | `c68c2c19c27e8c5e0340cf4b615a8d0b3f5e5e99` (`c68c2c1`) local = remoto, working tree limpo, 787 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados                                         |
| Ar     | entry **novo** `index-BOthbvNE.js` / `index-fT4j6Can.js`, **214 chunks / 3.199.677 bytes**, 0 falhas; **6 marcadores da 61 = 2** (rótulo visível + `aria-label`), 6 da 60 = 1, 3 da 59 = 1, marcadores da 58 = 1 |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`** (com parâmetros corretos); `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 474 linhas inalterados                                          |

**Publicação da Onda 61 relatada pelo dono e validada por cliques reais em
produção:** `/references` com o filtro nomeado "Filtrar por status"
(`aria-label` da 61), 0 campos sem nome, 0 `pageerror`; `/financial` 0/2.
Captura `/home/user/medicao56-prod-references.png`.

> Nota de medição: a primeira sonda das RPCs com corpo `{}` devolveu
> `404 PGRST202` — erro da sonda, não do banco (função sem parâmetros não
> casa a assinatura). Com os parâmetros corretos (`_order_id`, `_ref_type`,
> `_ref_id`, `_motivo`, `_item_id`, `_warehouse_id`), as 4 funções voltam a
> `401 42501`, idênticas às medições 24ª–55ª. Banco inalterado.

**Repo, ar e banco alinhados na Onda 61, sem publicação pendente.**

---

## 2. Como a Onda 62 foi escolhida pelo risco

Varredura de siglas no texto visível das 44 rotas e componentes (critério
das Ondas 45/58: texto entre tags e `label`/`title`/`placeholder`/
`aria-label`):

| Medida                                                          | Resultado                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Siglas em texto visível fora do glossário                       | **OP 32×**, B2B 15×, ERP 9×, ABC 7×, OS 6×, MOQ 3×, RLS 5×, RBAC 2× + ruído (formatos de arquivo, `A4`, `PLM`, `IA`) |
| Siglas da dívida (MOQ/UTM/CAC/CMV) confirmadas em texto visível | MOQ (materials, supplier-portal), UTM/CAC (painel de seeding), CMV (financial, audit)                                |
| Rotas que usam os termos novos sem `GlossarioTermos`            | **materials, supplier-portal, influencers, production**                                                              |

A varredura de emissores não achou nenhum documento sem guarda. O risco
remanescente mais alto era o jargão sem tradução em telas de operação —
quem está no primeiro dia encontra `OP`, `MOQ`, `TCO`, `UTM`, `CAC`, `CMV`,
`ABC`, `OS` e `ERP` sem explicação. `DEV000006` (20×) e `CollectionROI`
seguem como vitrine/estimativa **declaradas**; `dias_ativa` segue `200 []`
correto (sem reservas ativas, a view vazia é o comportamento certo).

---

## 3. O que foi entregue

**9 termos novos** em `src/lib/onboarding/glossario.ts` (39 → **48**, sem
duplicatas), cada um com `nome` e `explicacao` em português simples:

| Sigla | Nome                               | Onde aparece em texto visível                            |
| ----- | ---------------------------------- | -------------------------------------------------------- |
| OP    | Ordem de produção                  | production ("não há OP no banco", "Por OP / Rota") — 32× |
| MOQ   | Quantidade mínima de pedido        | materials, supplier-portal ("MOQ (unidade)")             |
| TCO   | Custo total de aquisição           | supplier-portal ("Mapa Comparativo TCO")                 |
| UTM   | Parâmetros de rastreamento de link | painel de seeding ("Cupom / UTM", "Copiar Link UTM")     |
| CAC   | Custo de aquisição de cliente      | painel de seeding ("ROAS / CAC")                         |
| CMV   | Custo da mercadoria vendida        | financial ("Custo Mercadoria (CMV)")                     |
| ABC   | Curva ABC de estoque               | audit ("Cron da curva ABC")                              |
| OS    | Ordem de serviço                   | facção ("Ordem de Serviço")                              |
| ERP   | Sistema de gestão empresarial      | references ("custos, ERP") — o PLM não é ERP             |

**`GlossarioTermos` com `siglas` medidas por tela + `testId` próprio** nas
4 rotas que usavam os termos sem glossário:

| Rota            | `siglas`                                 | `testId`                    |
| --------------- | ---------------------------------------- | --------------------------- |
| materials       | `MOQ`, `SKU`                             | `glossario-materials`       |
| supplier-portal | `MOQ`, `TCO`, `OP`, `BOM`, `OTIF`, `RFQ` | `glossario-supplier-portal` |
| influencers     | `UTM`, `CAC`, `ROAS`, `CFOP`             | `glossario-influencers`     |
| production      | `OP`, `PCP`                              | `glossario-production`      |

**20 rotas com glossário** (16 da Onda 58 + 4 da 62). Teste novo:
`src/lib/onboarding/onda62-glossario.test.ts` (**6 asserções**). O teste da
Onda 58 só teve a contagem 39 → 48 atualizada — nenhuma asserção relaxada.

**O que NÃO mudou:** nenhum rótulo de módulo, nenhum handler, nenhum store,
nenhuma migration SQL. O glossário é um `<details>` colapsado: quem já opera
não perde espaço.

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                       | ANTES (Onda 61) | DEPOIS (Onda 62)                                                      |
| ---------------------------- | --------------- | --------------------------------------------------------------------- |
| Termos no dicionário         | **39**          | **48**                                                                |
| Rotas com `GlossarioTermos`  | **16**          | **20**                                                                |
| `/materials` glossário       | ausente         | `MOQ — Quantidade mínima de pedido`, `SKU — Variação do produto`      |
| `/supplier-portal` glossário | ausente         | 6 termos (`MOQ`, `TCO`, `OP`, `BOM`, `OTIF`, `RFQ`)                   |
| `/influencers` glossário     | ausente         | 4 termos (`UTM`, `CAC`, `ROAS`, `CFOP`)                               |
| `/production` glossário      | ausente         | `OP — Ordem de produção`, `PCP — Planejamento e controle da produção` |
| `pageerror`                  | 0               | **0**                                                                 |

Captura `/home/user/medicao56-supplier-portal-glossario.png`.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 56ª medição (depois de fechar a Onda 62)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **783/783** (777 + 6).

| Camada        | 56ª medição                                                                                                                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 62** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                                                                                                                                |
| App publicado | **Onda 61** — entry `index-BOthbvNE.js` / `index-fT4j6Can.js`, 214 chunks / 3.199.677 bytes, 0 falhas (idêntico ao início da medição); 6 marcadores da 61 = 2, 6 da 60 = 1, 3 da 59 = 1. Os termos novos do glossário aparecem como texto novo no bundle, então a prova de não-publicação é **entry/bytes inalterados** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                                                                                                                                        |

**Há uma publicação pendente (a 62)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 61/60/59/58 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- 24 rotas ainda sem `GlossarioTermos` (`admin.users`, `ai-agents`,
  `ai-center`, `approvals`, `cad`, `catalog`, `collection-map`,
  `collections.compare`, `colors`, `digital-twin`, `display`, `feed`,
  `flow`, `looks`, `measurements`, `official-models`, `pieces-report`,
  `prints`, `production.today`, `prototypes`, `references`, `research`,
  `showroom`, `tech-sheet`) — a maioria de baixa densidade de jargão, mas
  `tech-sheet`, `measurements` e `references` têm siglas de domínio
  (`BOP`, `NCM`, `CAPA`) que merecem glossário. **Candidato natural à Onda 63.**
- `B2B` (15×) e `RLS`/`RBAC` seguem fora do glossário — jargão comum ou
  técnico de segurança, menor prioridade que o de operação.
- `DEV000006` 20× como vitrine declarada; `CollectionROI` estimativa declarada;
  revisar `stock_reservation_aging.dias_ativa` (hoje `200 []`, correto).
- O contador estático de campos sem nome tem falsos positivos conhecidos
  (`<label>` envolvente, `aria-label` após `=>`, definições de componente):
  a prova real é sempre DOM + fonte, nunca só o número bruto.
