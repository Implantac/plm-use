# Onda 63 — Glossário em todas as rotas com jargão (57ª medição)

> **`ok prossiga com as melhorias` = medir, escolher a onda seguinte pelo
> risco, sem perguntar, implementar, provar por cliques e empurrar.** Este
> documento é uma **medição**, não um plano. Publicar o app não aplica SQL e
> nenhuma asserção das Ondas 22/23/27–62 foi relaxada.

---

## 1. 57ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 63)                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo   | `d822c8665f1fc2b807f9ec41058904bb7490aa3e` (`d822c86`) local = remoto, working tree limpo, 790 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados                                             |
| Ar     | entry `index-BOthbvNE.js` / `index-fT4j6Can.js`, **214 chunks / 3.199.677 bytes**, 0 falhas; **6 marcadores da 61 = 2**, 6 da 60 = 1, 3 da 59 = 1; **marcadores da 62 = 0** (entry/bytes idênticos ao início da 56ª) |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`** (com parâmetros corretos); `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 474 linhas inalterados                                              |

**A Onda 62 ainda não foi publicada** (entry e bytes inalterados; os 5
marcadores exclusivos da 62 = 0). Não é defeito de código — é deploy
pendente, como nas medições anteriores.

**Repo na Onda 62, ar na Onda 61, banco inalterado — há duas publicações
pendentes (62 e 63), por deploy, não por defeito.**

---

## 2. Como a Onda 63 foi escolhida pelo risco

Re-varredura de siglas no texto visível das 24 rotas sem glossário
(critério das Ondas 45/58/62):

| Medida                                         | Resultado                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rotas sem glossário                            | **24**                                                                                                                                                       |
| Rotas com siglas do glossário no texto visível | **12** — tech-sheet 9, approvals 5, research 5, digital-twin 4, cad 2, catalog/flow/looks/measurements/prototypes/references/showroom 1 cada                 |
| Rotas com 0 siglas (não precisam de glossário) | 12 — admin.users, ai-agents, ai-center, collection-map, collections.compare, colors, display, feed, official-models, pieces-report, prints, production.today |
| Siglas frequentes fora do dicionário           | **B2B 15×, RLS 5×, RBAC 2×** (audit, security)                                                                                                               |

A varredura de emissores não achou nenhum documento sem guarda. O risco
remanescente mais alto era o jargão sem tradução nas rotas de operação
restantes — sobretudo `/tech-sheet` (9 siglas, rota central) e
`/approvals`/`/research` (5 cada). `DEV000006` (47 ocorrências na fonte)
segue como vitrine declarada — a auditoria ponta a ponta é a próxima
onda candidata, mas as guardas já existem e o risco é menor que o do
jargão sem tradução.

---

## 3. O que foi entregue

**3 termos novos** em `src/lib/onboarding/glossario.ts` (48 → **51**, sem
duplicatas), cada um com `nome` e `explicacao` em português simples que
respeita a regra da Onda 45 (sem "conforme o" nem "ver "):

| Sigla | Nome                          | Onde aparece em texto visível                |
| ----- | ----------------------------- | -------------------------------------------- |
| B2B   | Venda entre empresas          | audit ("carteira B2B", "Clonagem B2B") — 15× |
| RLS   | Segurança em nível de linha   | audit, security ("Isolamento RLS") — 5×      |
| RBAC  | Controle de acesso por função | audit, security ("Governança RBAC") — 2×     |

**`GlossarioTermos` com `siglas` medidas por tela + `testId` próprio** nas
12 rotas com jargão:

| Rota         | `siglas`                                   | `testId`                 |
| ------------ | ------------------------------------------ | ------------------------ |
| tech-sheet   | ABNT, BOM, BOP, CAD, MRP, NCM, OP, PV, SKU | `glossario-tech-sheet`   |
| approvals    | ABNT, BOM, BOP, CAD, POM                   | `glossario-approvals`    |
| research     | ABNT, CAD, DPP, ESG, OTB                   | `glossario-research`     |
| digital-twin | BOM, BOP, MRP, PV                          | `glossario-digital-twin` |
| cad          | BOM, CAD                                   | `glossario-cad`          |
| catalog      | PCP                                        | `glossario-catalog`      |
| flow         | PCP                                        | `glossario-flow`         |
| looks        | PV                                         | `glossario-looks`        |
| measurements | POM                                        | `glossario-measurements` |
| prototypes   | POM                                        | `glossario-prototypes`   |
| references   | CAPA                                       | `glossario-references`   |
| showroom     | CAPA                                       | `glossario-showroom`     |

**B2B/RLS/RBAC somados** aos arrays de `audit` e `security` (onde foram
medidos). **32 rotas com glossário** — todas as rotas com jargão. As 12
rotas com 0 siglas não precisam de glossário (adicionar seria ruído).

**Detalhe de implementação:** `/tech-sheet` tem retorno antecipado de
estado vazio (`cockpit-sem-ficha` — "Nenhuma ficha técnica salva"). O
glossário foi adicionado **também** nesse ramo, porque é a primeira tela
de quem chega (só um ramo renderiza por vez, sem `testId` duplicado no
DOM). A prova por cliques mediu o estado vazio: 9 termos corretos.

Teste novo: `src/lib/onboarding/onda63-glossario.test.ts` (**7
asserções**). Os testes das Ondas 58 e 62 só tiveram a contagem 48 → 51
atualizada — nenhuma asserção relaxada.

**O que NÃO mudou:** nenhum rótulo de módulo, nenhum handler, nenhum store,
nenhuma migration SQL.

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                         | ANTES (Onda 62) | DEPOIS (Onda 63)                                                             |
| ------------------------------ | --------------- | ---------------------------------------------------------------------------- |
| Termos no dicionário           | **48**          | **51**                                                                       |
| Rotas com `GlossarioTermos`    | **20**          | **32**                                                                       |
| Rotas com jargão sem glossário | **12**          | **0**                                                                        |
| `/tech-sheet` glossário        | ausente         | 9 termos (ABNT, BOM, BOP, CAD, MRP, NCM, OP, PV, SKU)                        |
| `/approvals` glossário         | ausente         | 5 termos                                                                     |
| `/research` glossário          | ausente         | 5 termos                                                                     |
| `/digital-twin` glossário      | ausente         | 4 termos                                                                     |
| 8 rotas de 1–2 siglas          | ausente         | cad 2, catalog/flow/looks/measurements/prototypes/references/showroom 1 cada |
| `pageerror`                    | 0               | **0**                                                                        |

Captura `/home/user/medicao57-tech-sheet-glossario.png`.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 57ª medição (depois de fechar a Onda 63)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **790/790** (783 + 7).

| Camada        | 57ª medição                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 63** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                      |
| App publicado | **Onda 61** — entry `index-BOthbvNE.js` / `index-fT4j6Can.js`, 214 chunks / 3.199.677 bytes, 0 falhas (idêntico ao início da medição); 6 marcadores da 61 = 2, 6 da 60 = 1, 3 da 59 = 1; marcadores da 62 = 0 |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                              |

**Há duas publicações pendentes (62 e 63)** — por deploy, não por defeito
de código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde
a 24ª medição. Marcadores 61/60/59/58 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- **Auditoria `DEV000006` ponta a ponta** (47 ocorrências na fonte, 20 no
  bundle): confirmar selo "Demonstração" em cada superfície onde a ficha
  de demonstração surge em tela. As guardas das Ondas 47–59 já existem;
  falta a varredura completa. **Candidato natural à Onda 64.**
- Mock no cron `launch-performance.ts:39` (único `TODO` real) — ligar ao
  `ErpAdapter` quando o ERP existir; confirmar rótulo na tela que o consome.
- `CollectionROI` estimativa declarada — vira apuração com venda real.
- Revisar `stock_reservation_aging.dias_ativa` com reserva de teste antes
  de qualquer migration (hoje `200 []`, correto).
- O glossário agora cobre **todas** as rotas com jargão (32/44); as 12
  restantes têm 0 siglas medidas e não precisam.
