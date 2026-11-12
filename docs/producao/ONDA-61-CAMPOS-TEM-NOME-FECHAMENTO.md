# Onda 61 — Fechamento dos campos sem nome (55ª medição)

> **`ok prossiga com as melhorias` = medir, escolher a onda seguinte pelo
> risco, sem perguntar, implementar, provar por cliques e empurrar.** Este
> documento é uma **medição**, não um plano. Publicar o app não aplica SQL e
> nenhuma asserção das Ondas 22/23/27–60 foi relaxada.

---

## 1. 55ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 61)                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo   | `f01ab5105935a5f6320e23ff2bb85bf8a70baa77` (`f01ab51`) local = remoto, working tree limpo, 785 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados |
| Ar     | entry **novo** `index-BQ5zgD_R.js` / `index-Bt3hn52q.js`, **214 chunks / 3.198.301 bytes**, 0 falhas; **6 marcadores da 60 = 1**, 3 da 59 = 1, marcadores da 58 = 1      |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`**; `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 473 linhas inalterados                            |

**Publicação não relatada detectada por BFS** (como nas 30ª/43ª medições): o
entry havia avançado de `index-IvTyinWJ.js` para `index-BQ5zgD_R.js` com os
marcadores das Ondas 59 **e** 60. Validada por cliques reais em produção:
`/influencers` com `h1 = 1`, `434`/`563%` ausentes, 2 avisos, **0 guias**,
5 selos "Demonstração"; `/supplier-portal` com diálogo "Cadastrar fornecedor"
**0/11** sem nome; 0 `pageerror`. Capturas
`/home/user/medicao55-prod-influencers.png`,
`/home/user/medicao55-prod-supplier-portal.png`.

**Repo, ar e banco alinhados na Onda 60, sem publicação pendente.**

---

## 2. Como a Onda 61 foi escolhida pelo risco

Contagem estática na fonte (critério das Ondas 49/52/60: sem `aria-label`,
sem `id`+`htmlFor`, sem `title`):

| Medida                                                          | Resultado                                                                                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campos sem nome na fonte (após a Onda 60)                       | **78** no contador bruto                                                                                                                                                     |
| Falsos positivos de `<label>` envolvente                        | `materials` 7, `OpWorkspace` 3, `planner` 3, `looks` 3, `compare` 2                                                                                                          |
| Falsos positivos de comentário/definição/`aria-label` após `=>` | `ProductStudio` 1, `TechSketchPanel` 1, `NovaReferenciaDialog` 1, `AplicacoesPanel` 1, `field` 1, `sidebar` 1, `textarea` 1, `approvals` 1, `development` 1, `collections` 1 |
| **Universo real**                                               | **48 campos em 18 arquivos**                                                                                                                                                 |

A varredura de emissores não achou nenhum documento sem guarda (todos os
`window.open`/print têm guarda ou leem dado real). O risco remanescente mais
alto era fechar o universo de acessibilidade iniciado nas Ondas 49/52/60 —
PCP (passagem/ocorrência), engenharia de rota, estúdio de IA, corte,
financeiro, medidas, estoque, analytics e comentários. Jargão sem glossário
(8 rotas de menor densidade) não impede a operação; campo sem nome impede.

---

## 3. O que foi entregue

`aria-label` derivado do `<Label>` visível (ou da coluna, com índice) em
**18 arquivos / 48 campos**, sem mudar handler, validação ou store:

| Arquivo                     | Campos | Exemplos                                                                              |
| --------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `PassagemForm.tsx`          | 6      | `Tipo`, `Setor destino`, `Tipo de defeito`, `Quantidade`, `Responsável`, `Observação` |
| `OcorrenciaForm.tsx`        | 5      | `Tipo`, `Quantidade`, `Motivo`, `Responsável`, `Observação`                           |
| `route-engineering.tsx`     | 4      | `Jornada (min/dia)`, `Eficiência (%)`, `Meta Diária (pçs)`, `Custo Minuto (R$)`       |
| `ProductStudio.tsx`         | 3      | `Variações de cor`, `Posição na peça`, `Técnica`                                      |
| `CuttingRoomPlanPanel.tsx`  | 4      | `Cor do Enfesto`, `Folhas Totais`, `Máx. Folhas/Mesa`, `Pontas (cm)`                  |
| `financial.tsx`             | 4      | `Título / Categoria`, `Fonte`, `Valor`, `Vencimento`                                  |
| `measurements.tsx`          | 4      | `Código`, `Nome`, `Categoria`, `Segmento`                                             |
| `MovementDialog.tsx`        | 3      | `Tipo`, `Lote (opcional)`, `Justificativa`                                            |
| `analytics.tsx`             | 3      | `Nome do Indicador`, `Valor Atual`, `Meta / Subtítulo`                                |
| `CommentsPanel.tsx`         | 2      | `Editar comentário`, `Escreva um comentário`                                          |
| `PreCostPanel.tsx`          | 2      | `Arquivo Molde CAD`, `aria-label={label}` no `FieldNum`                               |
| `TechSheetVersions.tsx`     | 2      | `Resumo da alteração`, `Alterações (separe por ; )`                                   |
| `CostQueueNominalPanel.tsx` | 1      | `Cole do Excel ou edite (1 peça por linha)`                                           |
| `collection-map.tsx`        | 1      | `Nome`                                                                                |
| `inventory.tsx`             | 1      | `aria-label={label}` (mapa de LEC)                                                    |
| `launch.tsx`                | 1      | `Wave destino`                                                                        |
| `prints.tsx`                | 1      | `Formato`                                                                             |
| `references.tsx`            | 1      | `Filtrar por status` (filtro sem rótulo visível)                                      |

**O que NÃO mudou:** nenhuma validação, nenhum `onChange`, nenhum store,
nenhuma migration SQL. Os falsos positivos de `<label>` envolvente foram
deixados como estão (já são nome acessível no DOM).

Teste novo: `src/lib/onboarding/onda61-campos-tem-nome.test.ts` (**7
asserções**), incluindo o SHA-256 inalterado do SQL aplicado.

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                                             | ANTES (Onda 60) | DEPOIS (Onda 61) |
| -------------------------------------------------- | --------------- | ---------------- |
| Fonte: campos sem nome (contador bruto)            | **78**          | **30**           |
| Fonte: campos reais (descontados falsos positivos) | **48**          | **0**            |
| DOM `/financial` carga                             | 0 / 2           | **0 / 2**        |
| DOM `/measurements` carga                          | 0 / 26          | **0 / 26**       |
| DOM `/references` carga (filtro nomeado)           | 1 sem nome      | **0 / 2**        |
| DOM `/analytics` carga                             | 0 / 1           | **0 / 1**        |
| `pageerror`                                        | 0               | **0**            |

Captura `/home/user/medicao55-references-depois.png`. Os painéis de PCP,
ficha técnica e estúdio só montam com dados salvos; a prova deles é a
contagem na fonte zerada nos 18 arquivos + os marcadores do teste.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 55ª medição (depois de fechar a Onda 61)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **777/777** (770 + 7).

| Camada        | 55ª medição                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 61** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                                                                                                                          |
| App publicado | **Onda 60** — entry `index-BQ5zgD_R.js` / `index-Bt3hn52q.js`, 214 chunks / 3.198.301 bytes, 0 falhas (idêntico ao início da medição); 6 marcadores da 60 = 1, 3 da 59 = 1. Os `aria-label` da 61 duplicam o rótulo visível, então a prova de não-publicação é **entry/bytes inalterados**, não contagem de texto |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                                                                                                                                  |

**Há uma publicação pendente (a 61)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 60/59/58/57 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- Jargão sem glossário em rotas de menor densidade (`ai-agents`,
  `pieces-report`, `research`, `supplier-portal`, `digital-twin`,
  `influencers`, `approvals`, `flow`); `MOQ`, `UTM`, `CAC`, `CMV` ainda não
  estão entre os 39 termos do `glossario.ts`. **Candidato natural à Onda 62.**
- `DEV000006` 20× como vitrine declarada; `CollectionROI` estimativa declarada;
  revisar `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- O contador estático de campos sem nome tem falsos positivos conhecidos
  (`<label>` envolvente, `aria-label` após `=>`, definições de componente):
  a prova real é sempre DOM + fonte, nunca só o número bruto.
