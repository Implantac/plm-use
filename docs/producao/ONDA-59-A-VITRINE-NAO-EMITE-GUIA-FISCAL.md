# Onda 59 — A vitrine de influencers não apura ROI nem emite guia fiscal (53ª medição)

> **`ok prossiga` = medir, escolher a onda seguinte pelo risco, sem perguntar,
> implementar, provar por cliques e empurrar.** Este documento é uma **medição**,
> não um plano. Publicar o app não aplica SQL e nenhuma asserção das Ondas
> 22/23/27–58 foi relaxada.

---

## 1. 53ª medição — ponto de partida re-medido

O último turno havia reinstalado o ambiente mas **não havia concluído** a
medição de ar/banco (o script `/tmp/ux61_ar.py` não persistiu entre turnos).
Antes de escolher qualquer código, as três camadas foram re-medidas:

| Camada | Medição (antes da Onda 59)                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo   | `f551a83564680866051221c5ea1d88d52dce7b46` (`f551a83`) local = remoto, working tree limpo, 781 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados |
| Ar     | entry **`index-IvTyinWJ.js` / `index-pMXbg9-8.js`**, **214 chunks / 3.183.607 bytes**, 0 falhas; 6 marcadores da 58 = 1, `cta-lancar-pedido-pcp` 1, `DEV000006` 20       |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`**; `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 473 linhas inalterados                            |

**Repo, ar e banco alinhados na Onda 58, sem publicação pendente.** O relato
"lovable não recebeu esse commit" continuava não confirmado.

---

## 2. Como a Onda 59 foi escolhida pelo risco

Dívidas conhecidas après a Onda 58: jargão em 8 rotas de menor densidade,
`DEV000006` 20× como vitrine declarada, `CollectionROI` estimativa declarada,
drawers acionados por sequência de cliques não cobertos e
`stock_reservation_aging.dias_ativa`. A varredura **com cliques reais** em
`/influencers` (browser local, sessão simulada para medir UX) achou um risco
maior que todos eles, e que a Onda 58 não havia tocado:

| Achado (ANTES)                                                                                  | Medição                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Creators de fábrica no store (`Marina Costa` … `Helena Souto`)                                  | **5**, sem nenhum selo de vitrine                                                                                               |
| KPIs "Influencers / Envios / Vendas atribuídas / Eng. médio"                                    | **5 / 6 / 434 / 8,6%** apresentados como apurados                                                                               |
| "ROI estimado" no card de investimento                                                          | **563%** (ticket médio R$ 350)                                                                                                  |
| Painel "Atribuição de Seeding (Cupom / UTM), ROAS Líquido & Remessa Bonificação CFOP 5910/6910" | **5 linhas** com custo total, receita atribuída, ROAS, CAC, cupom e CFOP                                                        |
| Botões `Guia 6910` habilitados                                                                  | **5 / 5**                                                                                                                       |
| A4 impresso ao clicar no 1º                                                                     | título `Guia de Remessa Bonificação CFOP 6910 · Marina Costa`, **`NATUREZA FISCAL: REMESSA EM BONIFICAÇÃO`**, 2 refs de exemplo |
| Aviso de vitrine na tela                                                                        | **0**                                                                                                                           |
| Campos **sem nome acessível** no diálogo "Registrar envio" (2 cliques: card → "Novo envio")     | **2 / 2**                                                                                                                       |
| `resumoInfluencers()` no copiloto de Marketing AI                                               | "Top influencers: … 142 vendas …" enviado como contexto real                                                                    |
| `CollectionROI` (`/collections`)                                                                | `investInfluencer` somava os cachês dos 5 seeds mesmo com lote **real**                                                         |

Ou seja: **um documento com natureza fiscal, CFOP e cupom era emitido a partir
de dados de demonstração**, e esses mesmos dados contaminavam ROI de coleção e
o contexto do copiloto. Isso fere diretamente as regras herdadas das Ondas
22/23/27–58 (só registro salvo entra em número/documento operacional; vitrine
vira `—` com aviso/CTA; vitrine só é promovida por ação explícita) e o limite
do produto (o PLM deliberadamente não é ERP/fiscal). Jargão sem glossário é
importante, mas não emite documento — **a Onda 59 é a guia fiscal da vitrine**.

---

## 3. O que foi entregue

**`src/lib/influencers/store.ts`** — os 5 seeds passam a `demo: true`;
`CRIADOR_DEMO_LABEL`, `influencerEhVitrine()` (reconhece também linhas antigas
hidratadas sem a flag, pelo handle) e `influencersOperacionais()` filtram a
vitrine em **um só lugar**. `resumoInfluencers()` declara ausência em vez de
descrever os seeds como operação. Nova ação `registrarCreator()` cria creator
**salvo** (`demo: false`) com a **primeira remessa real** — promoção apenas por
ação explícita, sem `seedFor` silencioso.

**`src/lib/influencers/seeding-attribution.ts`** — `SEEDING_DEMO_BLOQUEIO`,
`podeEmitirGuiaBonificacao()` (creator salvo **e** ≥ 1 envio) e
`linhasSeedingOperacionais()`. `evaluateCreatorAttribution()` e
`buildSeedingBonusDispatchHtml()` **continuam funções puras**: o teste antigo
do cupom `USEMARINACO10`/CFOP `6910` segue verde.

**`src/components/influencers/SeedingAttributionPanel.tsx`** — sem creators
salvos: selo de proveniência `demonstracao`, aviso `seeding-so-vitrine`,
`— nenhuma linha apurável`, **0 botões de guia** e CTA para registrar creator.
Com creator salvo: tabela apurada, `aria-label` no botão de UTM e guia
`disabled` quando não há remessa.

**`src/routes/_authenticated.influencers.tsx`** — 4 KPIs, heat map das 5
regiões, investimento e ROI em **`—`** com aviso e CTA; cards da vitrine com
selo "Demonstração" e números em `—`; drawer de vitrine com "Novo envio"
bloqueado; novo diálogo **"Registrar creator real"** (11 campos, todos com
`id`/`htmlFor` + `aria-label`); os **2 campos do diálogo oculto** de envio
ganharam nome acessível. O caminho normal (creator salvo) continua funcional.

**`src/components/collections/CollectionROI.tsx`** — `investInfluencer` agora
usa `influencersOperacionais()`: um lote real não herda mais os cachês da
vitrine. **`src/lib/cloud-sync.ts`** e **`src/lib/creative-sync.ts`** — linhas
hidratadas de seeds antigos voltam marcadas como vitrine; o round-trip de
creator salvo continua idêntico (asserção antiga preservada).

Teste novo: `src/lib/onboarding/onda59-influencer-vitrine.test.ts` (**9
asserções**), incluindo o SHA-256 inalterado do SQL aplicado. **Nenhuma
migração SQL foi escrita ou aplicada.**

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                                | ANTES (só vitrine) | DEPOIS (só vitrine)                        | DEPOIS de registrar `Ana Real`       |
| ------------------------------------- | ------------------ | ------------------------------------------ | ------------------------------------ |
| `434` vendas / `563%` ROI no texto    | sim / sim          | **não / não**                              | não / não                            |
| Aviso `influencer-so-vitrine`         | 0                  | **1**                                      | 0                                    |
| Aviso/CTA `seeding-so-vitrine`        | 0                  | **1 / 1**                                  | 0 / 0                                |
| Selo de proveniência                  | "local"            | **"Demonstração — não usar para decidir"** | "Dados do navegador (sincronizados)" |
| Linhas ROAS/CAC/CFOP                  | 5                  | **0** (`— nenhuma linha apurável`)         | **1**                                |
| Botões `Guia …` habilitados           | **5**              | **0 botões**                               | **1 habilitado**                     |
| Heat map                              | números dos seeds  | **5× `—`**                                 | `Sudeste 17`, demais `0`             |
| Selos "Demonstração" nos cards        | 0                  | **5**                                      | 5 (vitrine separada)                 |
| Campos sem nome no diálogo de envio   | **2 / 2**          | **0 / 2**                                  | **0 / 2**                            |
| Campos sem nome no diálogo de creator | —                  | **0 / 11**                                 | —                                    |
| Drawer da vitrine: "Novo envio"       | habilitado         | **`disabled`** + aviso                     | habilitado no creator salvo          |
| `pageerror`                           | 0                  | **0**                                      | **0**                                |

**Fluxo operacional executado de ponta a ponta:** clique em
`cta-influencer-registrar` → diálogo com 11 campos → preencher `Ana Real`,
`@anareal`, `SP`, `Sudeste`, `Micro`, `12000` seguidores, `R$ 900`, `17`
vendas, `VT900` / `Vestido Real` → `btn-salvar-creator` → toast
"Creator Ana Real salvo com a primeira remessa" → KPIs e heat map passam a
apurados, 1 linha de seeding e 1 guia habilitada → clique na guia abre A4
`Guia de Remessa Bonificação CFOP 6910 · Ana Real` com `NATUREZA FISCAL`,
`Ana Real` e `VT900`, **sem `Marina Costa`**. O modal "Registrar envio" do
creator salvo abriu com 0 campos sem nome. Capturas:
`/home/user/medicao53-influencers-antes.png`,
`/home/user/medicao53-modal-envio-antes.png`,
`/home/user/medicao53-influencers-depois.png`,
`/home/user/medicao53-guia-creator-salvo.png`.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 53ª medição (depois de fechar a Onda 59)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **763/763** (754 + 9).

| Camada        | 53ª medição                                                                                                                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 59** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                                                                                                           |
| App publicado | **Onda 58** — entry ainda `index-IvTyinWJ.js` / `index-pMXbg9-8.js`, 214 chunks / 3.183.607 bytes, 0 falhas; **6 marcadores da 59 = 0** (`influencer-so-vitrine`, `seeding-so-vitrine`, `dialogo-registrar-creator`, `btn-salvar-creator`, `cta-influencer-registrar`, `drawer-vitrine-sem-envio`) |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                                                                                                                   |

**Há uma publicação pendente (a Onda 59)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 58 = 1 e 57/47 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- Jargão sem glossário em rotas de menor densidade (`ai-agents`,
  `pieces-report`, `research`, `supplier-portal`, `digital-twin`,
  `influencers`, `approvals`, `flow`); `MOQ`, `UTM`, `CAC`, `CMV` ainda não
  estão entre os 39 termos do `glossario.ts`.
- `DEV000006` 20× como vitrine declarada; `CollectionROI` segue estimativa de
  referência declarada, não BI/fiscal; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Outros painéis que exigem sequência de cliques ou dados prévios ainda não
  foram cobertos por uma varredura exaustiva de campos sem nome.
