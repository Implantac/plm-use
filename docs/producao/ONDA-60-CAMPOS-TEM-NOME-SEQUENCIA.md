# Onda 60 — Campos de diálogo/painel têm nome (54ª medição)

> **`prossiga` = medir, escolher a onda seguinte pelo risco, sem perguntar,
> implementar, provar por cliques e empurrar.** Este documento é uma **medição**,
> não um plano. Publicar o app não aplica SQL e nenhuma asserção das Ondas
> 22/23/27–59 foi relaxada.

---

## 1. 54ª medição — ponto de partida re-medido

| Camada | Medição (antes da Onda 60)                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo   | `8c7f6a680e55a66a734dcd853e199271014c1998` (`8c7f6a6`) local = remoto, working tree limpo, 783 arquivos `100644`, token fora de `.git/config` e dos arquivos versionados                     |
| Ar     | entry **`index-IvTyinWJ.js` / `index-pMXbg9-8.js`**, **214 chunks / 3.183.607 bytes**, 0 falhas; marcadores da 58 = 1, `cta-lancar-pedido-pcp` 1, `DEV000006` 20; **6 marcadores da 59 = 0** |
| Banco  | view `stock_reservation_aging` **`200 []`**; 4 funções **`401 42501`**; `APLICAR-ONDA-21-24.sql` SHA-256 `382f0f19…` e 473 linhas inalterados                                                |

**Repo na Onda 59, ar na Onda 58, banco inalterado.** A publicação da Onda 59
seguia pendente (nenhuma publicação não relatada detectada).

---

## 2. Como a Onda 60 foi escolhida pelo risco

Varredura com cliques reais nas 42 rotas (browser local, sessão simulada para
medir UX) + contagem estática na fonte (critério das Ondas 49/52: sem
`aria-label`, sem `id`+`htmlFor`, sem `title`):

| Medida                                           | Resultado                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campos sem nome acessível na carga inicial (DOM) | **43** — `tech-sheet` 23/29, `supplier-portal` 16/17, `looks` 3/9, `references` 1/2                                                                                                                   |
| Campos sem nome na fonte (180 no total)          | `supplier-portal` 20, `BomBopPanel` 18, `GarmentSketchStudio` 16, `showroom` 12, `OutsourcingServiceOrderPanel` 9, `OrderDetail` 8, `ReservationDialog` 7, `GradedMeasurementsPanel` 7, `materials` 7 |
| Emissores de documento sem guarda                | **0** — todos os `window.open`/print medidos têm guarda ou leem dado real                                                                                                                             |
| Rotas com jargão e sem glossário                 | 8 de menor densidade (dívida conhecida, sem emissão)                                                                                                                                                  |

**Correção metodológica:** os 7 de `materials` são **falso positivo** — o
`<label>` envolve o campo (`<label>Nome * <Input …/></label>`), que já é nome
acessível no DOM. Descontados, o universo real é **173 campos**, dos quais
**~102** estão nos 8 arquivos desta onda. O risco escolhido é o de
acessibilidade em telas de operação (portal do fornecedor, ficha técnica,
reserva de estoque — ligada às migrações 21/24 — e OS de facção): leitor de
tela anuncia "edit text" sem dizer qual campo. Jargão sem glossário é visível,
mas não impede a operação; campo sem nome impede.

---

## 3. O que foi entregue

`aria-label` derivado do `<Label>` visível (ou da coluna da tabela, com o
índice da linha) em **8 arquivos**, sem mudar handler, validação ou store:

| Arquivo                            | Campos | Exemplos de rótulo                                                                                                                                                                                                |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supplier-portal.tsx`              | 20     | `Código`, `Fornecedor`, `Código OP`, `Tiragem Planejada (peças)`, `Fornecedor da cotação ${qIdx + 1}`, `MOQ da cotação`, `OTIF (%) da cotação`                                                                    |
| `BomBopPanel.tsx`                  | 18     | `Tipo do item BOM ${idx + 1}`, `Material do item BOM`, `Perda (%) do item BOM`, `Etapa BOP ${sIdx + 1}`, `Tempo (min) da etapa BOP`, `Buscar material por nome, SKU ou fornecedor`, `Colar linhas do Excel (BOM)` |
| `GarmentSketchStudio.tsx`          | 16     | `Impostos %`, `Comissão %`, `Lucro Alvo %`, `Código Cor`, `Cor Principal (Corpo)`, `Nº do callout ${pinIdx + 1}`, `Vista do callout`, `Classificação Fiscal (NCM)`, `Fibra ${idx + 1} da composição têxtil`       |
| `showroom.tsx`                     | 12     | `Referência da peça-mãe`, `Referência avaliada`, `Dimensão`, `Autor`, `Justificativa`                                                                                                                             |
| `OutsourcingServiceOrderPanel.tsx` | 9      | `Referência SKU`, `Terceiro Homologado`, `M.O. R$/pç`, `Franquia %`                                                                                                                                               |
| `OrderDetail.tsx`                  | 8      | `Produto validado`, `Descrição no pedido`, `Quantidade da opção no item`                                                                                                                                          |
| `ReservationDialog.tsx`            | 7      | `Insumo`, `Armazém`, `Tipo`, `Referência`, `Observações`                                                                                                                                                          |
| `GradedMeasurementsPanel.tsx`      | 7      | `Código do ponto ${rIdx + 1}`, `Regra de graduação (cm) do ponto`, `Medida ${tam} do ponto ${rIdx + 1}`, `Colar medidas do Excel / Audaces`                                                                       |

**O que NÃO mudou:** nenhuma validação, nenhum `onChange`, nenhum store, nenhuma
migration SQL. Um `aria-label` duplicado introduzido por engano no input inline
de NCM (`GarmentSketchStudio`) foi removido antes dos gates — o original
`Código NCM fiscal` foi mantido.

Teste novo: `src/lib/onboarding/onda60-campos-tem-nome.test.ts` (**7
asserções**), incluindo o SHA-256 inalterado do SQL aplicado.

---

## 4. Prova por cliques reais (browser local, antes → depois)

| Medida                                         | ANTES (Onda 59)                  | DEPOIS (Onda 60)                                                                            |
| ---------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| Fonte: campos sem nome (critério 49/52)        | **180**                          | **78** (os 8 arquivos zerados; 7 de `materials` são falso positivo de `<label>` envolvente) |
| DOM `/supplier-portal` carga inicial           | 16 sem nome / 17 campos          | **0 / 0** (estado vazio)                                                                    |
| DOM `/supplier-portal` aba Fornecedores        | —                                | **0 / 1**                                                                                   |
| DOM diálogo "Cadastrar fornecedor" (11 campos) | 7 sem nome (rótulos sem vínculo) | **0 / 11**                                                                                  |
| DOM `/showroom` carga inicial                  | 0 / 2                            | **0 / 2**                                                                                   |
| `pageerror`                                    | 0                                | **0**                                                                                       |

Capturas: `/home/user/medicao54-supplier-portal-dialogo.png`,
`/home/user/medicao54-showroom-depois.png`. Os painéis de ficha técnica
(`BomBopPanel`, `GarmentSketchStudio`, `GradedMeasurementsPanel`) só montam
com ficha salva; no estado vazio têm 0 campos — a prova deles é a contagem na
fonte (zerada nos 3 arquivos) + os marcadores do teste.

> Sessão local simulada serve para medir UX; seus `401/403` e o banner
> "Verifique sua conexão" são artefato da medição, não do usuário autenticado.

---

## 5. Gates e 54ª medição (depois de fechar a Onda 60)

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **770/770** (763 + 7).

| Camada        | 54ª medição                                                                                                                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 60** — este commit; HEAD local = remoto conferido por `git ls-remote`, working tree limpo, token fora de `.git/config` e dos arquivos versionados                                                                                                                                            |
| App publicado | **Onda 58** — entry ainda `index-IvTyinWJ.js` / `index-pMXbg9-8.js`, 214 chunks / 3.183.607 bytes, 0 falhas; **6 marcadores exclusivos da 60 = 0** (`Fornecedor da cotação`, `Tipo do item BOM`, `Etapa BOP`, `Nº do callout`, `Referência da peça-mãe`, `Código do ponto`); 6 marcadores da 59 = 0 |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                                                                                                                    |

**Há duas publicações pendentes (59 e 60)** — por deploy, não por defeito de
código. Publicar o app **não aplica SQL**; o SQL já está aplicado desde a 24ª
medição. Marcadores 58/57/47 intactos no ar: nenhuma regressão.

---

## 6. Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- **71 campos sem nome restantes** na fonte (fora os 7 falsos positivos de
  `materials`): `PassagemForm` 6, `OcorrenciaForm` 5, `route-engineering` 5,
  `ProductStudio` 4, `CuttingRoomPlanPanel` 4, `financial` 4, `measurements` 4,
  `MovementDialog` 3, `OpWorkspace` 3, `analytics` 3, `looks` 3, `planner` 3 e
  outros — candidatos naturais à Onda 61.
- Jargão sem glossário em rotas de menor densidade (`ai-agents`,
  `pieces-report`, `research`, `supplier-portal`, `digital-twin`,
  `influencers`, `approvals`, `flow`); `MOQ`, `UTM`, `CAC`, `CMV` ainda não
  estão entre os 39 termos do `glossario.ts`.
- `DEV000006` 20× como vitrine declarada; `CollectionROI` estimativa declarada;
  revisar `stock_reservation_aging.dias_ativa` (hoje `200 []`).
