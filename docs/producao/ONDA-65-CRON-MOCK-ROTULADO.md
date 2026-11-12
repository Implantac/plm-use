# Onda 65 — Cron mock rotulado na tela que consome (59ª medição)

> **`ok prossiga com as melhorias` = medir, escolher a onda seguinte pelo
> risco, sem perguntar, implementar, provar por cliques e empurrar.** Este
> documento é uma **medição**, não um plano. Publicar o app não aplica SQL e
> nenhuma asserção das Ondas 22/23/27–64 foi relaxada.

---

## 1. 59ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 65)                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo   | `d4b1bb2a29e54312cbb37588fb590afe09f9aa52` (`d4b1bb2`) local = remoto, working tree limpo, 794 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados        |
| Ar     | entry **novo** `index-ClheCAuQ.js` / `index-O58aczOi.js`, **214 chunks / 3.203.213 bytes**, 0 falhas; 3 marcadores da 63 = 1, 2 da 62 = 1, 2 da 61 = 2; **`DEV000006` 20 → 18** |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`** (com parâmetros corretos); `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 474 linhas inalterados         |

**Publicação da Onda 64 relatada pelo dono e validada por cliques reais em
produção:** `/marketing` "Cadastrar Drop" abre sem `DEV000006` e sem
números inventados (só data/coleção/canal/formato), 0 `pageerror`. A queda
de `DEV000006` 20 → 18 no bundle confirma os 2 padrões do formulário
removidos. Captura `/home/user/medicao59-prod-marketing.png`.

**Repo, ar e banco alinhados na Onda 64, sem publicação pendente.**

---

## 2. Como a Onda 65 foi escolhida pelo risco

Investigação do único `TODO` real da fonte —
`src/routes/api/public/cron/launch-performance.ts:39`:

| Camada                           | Medição                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Cron                             | Emite `sell_through_pct: null` com `fonte: "cron:mock"` — **nenhum percentual inventado**                                                   |
| Hook (`useLaunch`)               | Busca os eventos `launch.performance.updated` num mapa `performance` — **nunca renderizado**                                                |
| Tela (`/launch` aba Performance) | Só descrevia os KPIs ("`sell_through_D30`", "o cron alimenta esta aba diariamente") **sem mostrar dado nenhum e sem rotular o placeholder** |

O dado já era honesto (`null`, não número de fábrica). O risco era a tela
**descrever** sell-through como se existisse, sem rotular o mock — o
usuário lê "sell_through_D30" e "alimenta esta aba diariamente" e conclui
que há apuração. A varredura de emissores não achou nenhum documento sem
guarda. `dias_ativa` segue `200 []` (correto); `CollectionROI` segue
estimativa declarada. Escolhido o rótulo honesto na tela que consome.

> Nota: o `TODO` dizia "substituir por `ErpAdapter.getSellThrough`". O PLM
> deliberadamente não é ERP — não há `ErpAdapter` para ligar. A correção
> correta é rotular o placeholder, não inventar a integração.

---

## 3. O que foi entregue

**A aba Performance de `/launch` agora renderiza o dado real do evento**
com o placeholder rotulado:

- Aviso `performance-sellthrough-mock`: "Sell-through ainda não apurável.
  O cron emite o evento diário com `sell_through_pct: null` e
  `fonte: "cron:mock"` — placeholder até a integração com o sistema de
  vendas. O PLM não é ERP: nenhum percentual é inventado aqui."
- Lista de waves com o snapshot do cron: código, janela (30 dias), fonte e
  badge **"sell-through —"** (null) com "Não apurável: o cron ainda emite
  placeholder (cron:mock)".
- Estado vazio honesto: "Nenhuma wave ainda. Crie a primeira na aba Waves."
- O mapa `performance` do `useLaunch` (antes buscado e nunca renderizado)
  agora é consumido pela tela.
- Comentário do cron atualizado: reflete o estado honesto atual (null +
  rótulo na tela) em vez do `TODO` de integração inexistente.

**O que NÃO mudou:** o cron continua emitindo `null` (nenhum número novo),
nenhum handler, nenhuma migration SQL. Quando houver integração real com
sistema de vendas, o `sell_through_pct` passa a vir preenchido e o badge
mostra o percentual — sem mudar a tela.

Teste novo: `src/lib/onboarding/onda65-cron-mock.test.ts` (**5 asserções**),
incluindo que não restou `TODO:` real no cron e o SHA-256 inalterado do
SQL aplicado.

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                             | ANTES (Onda 64)                                        | DEPOIS (Onda 65)                                                   |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `/launch` aba Performance          | Só descrição ("sell_through_D30", "alimenta esta aba") | Aviso do mock + waves com **"sell-through —"**                     |
| Rótulo do placeholder na tela      | **ausente**                                            | `performance-sellthrough-mock` com `cron:mock` e "O PLM não é ERP" |
| Números de sell-through inventados | 0 (nada renderizado)                                   | **0** (`—` para null)                                              |
| `pageerror`                        | 0                                                      | **0**                                                              |

Captura `/home/user/medicao59-launch-performance.png`.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 59ª medição (depois de fechar a Onda 65)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **801/801** (796 + 5).

| Camada        | 59ª medição                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 65** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                |
| App publicado | **Onda 64** — entry `index-ClheCAuQ.js` / `index-O58aczOi.js`, 214 chunks / 3.203.213 bytes, 0 falhas (idêntico ao início da medição); 3 marcadores da 63 = 1, 2 da 62 = 1, 2 da 61 = 2; `DEV000006` 18 |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                        |

**Há uma publicação pendente (a 65)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 63/62/61 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- Sell-through real: quando houver integração com sistema de vendas, o cron
  preenche `sell_through_pct` e a aba mostra o percentual (a tela já está
  pronta). Até lá, `—` com rótulo `cron:mock`.
- `CollectionROI` estimativa declarada — vira apuração com venda real.
- Revisar `stock_reservation_aging.dias_ativa` com reserva de teste antes
  de qualquer migration (hoje `200 []`, correto).
- Auditoria `DEV000006` concluída (Onda 64); glossário completo (Onda 63);
  campos sem nome zerados (Onda 61). O padrão "formulário pré-preenchido
  com dado de demonstração" deve ser vigiado em formulários novos.
