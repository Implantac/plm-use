# Onda 49 — Todo campo tem nome (30ª e 31ª medições, 06/11/2026)

> **Escolha por risco, sem confirmação.** O `ok prossiga` anterior pediu para
> escolher a onda seguinte sozinho. Em vez de assumir um tema, o ambiente foi
> re-medido por camada. Este documento é uma **medição**, não um plano.

---

## 1. 30ª medição — a Onda 48 foi publicada **sem marco relatado**

O dono não anunciou publicação. Ainda assim o BFS achou um entry novo:

| Medição                  | Entry no ar                                   | Marcadores da Onda 48 |
| ------------------------ | --------------------------------------------- | --------------------- |
| 29ª (documentada)        | `index-CdXaXBJP.js`                           | **0**                 |
| 30ª (nova, não relatada) | **`index-DPV0JUG6.js` / `index-DnKqdFO4.js`** | **1 cada (6/6)**      |

`media-kit-bloqueado`, `colecao-so-vitrine`, `line-sheet-bloqueado`,
`cta-colecao-sem-ficha`, `Coleção em cadastro`, `Editar para emitir` = **1**
cada; `ficha-cega-bloqueada` 1, `glossario-orders` 1, `DEV000006` 20. BFS da
30ª parcial: 227 chunks / 3.691.562 bytes. BFS da 31ª com crawler mais
estrito: **224 chunks / 3.175.104 bytes, 0 falhas**; como o entry tem **hash de
conteúdo**, o mesmo entry implica o **mesmo bundle** — a diferença de contagem
é amplitude do crawler, não mudança de produto. Seguir confirmando cegamente o
estado anterior teria deixado a publicação sem registro.

### Validação com cliques reais **em produção** (Chromium, sessão local, papel `admin` simulado)

| Tarefa                                                                | Resultado                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/marketing` na vitrine                                               | **3** `media-kit-bloqueado`, **1** `gtm-so-vitrine`, **0** botões "Media Kit A4"              |
| Clicar no aviso bloqueado                                             | **0 popups**                                                                                  |
| "Editar para emitir" → `Salvar Drop GTM`                              | toast `Drop GTM atualizado e persistido!`; **2** bloqueados, **1** botão                      |
| Clicar no botão liberado                                              | **1 popup**: `RELEASE GTM & MEDIA KIT · DROP 01 · ALTO VERÃO …`                               |
| `/collection-map` na vitrine                                          | `colecao-so-vitrine` 1, CTA 1, `line-sheet-bloqueado` 1, **0** botões CSV/A4, **0 apuráveis** |
| Clicar no aviso `line-sheet-bloqueado` (contador de popups **limpo**) | **0 popups, 0 downloads, 0 toasts**                                                           |
| Regressão `/orders`                                                   | `ficha-cega-bloqueada` 2, **0** botões Ficha Cega A4, **0** inputs sem rótulo                 |

> **Correção de medição:** na primeira passagem o contador de popups era
> compartilhado com a aba de `/marketing` e já valia 1, o que sugeria
> falsamente 1 popup no clique do aviso de `/collection-map`. Refeito com
> contador próprio: **0**. Capturas:
> `/home/user/onda49-producao-marketing.png`,
> `/home/user/onda49-producao-collection-map.png`.

**30ª medição: repo, ar e banco alinhados na Onda 48.** Banco re-medido: view
`200 []`, 4 funções `401 42501` (com as assinaturas corretas), SQL SHA-256
`382f0f19…` inalterado.

---

## 2. Como a Onda 49 foi escolhida

Varredura de risco em produção, sem supor tema:

- **16 emissores de documento** já haviam sido clicados na 29ª. Os **5** cujo
  clique falhou foram re-probados agora: `/financial` "DRE Gerencial (A4)",
  `/launch` "Exportar Feed CSV (GTIN/NCM)" e "Checklist Go/No-Go A4",
  `/planner` "Exportar", `/official-models` "Exportar CSV" estão
  **`disabled` (protegidos)**. Outros 5 (`/materials`, `/collections/compare`,
  `/production`, `/analytics`, `/collections`) clicaram sem popup, download
  ou toast. **Nenhum emissor desprotegido restou** — não havia onda de
  emissão a fazer, e inventar uma seria regressão.
- O risco remanescente **medido** era outro: **campos sem nome acessível** em
  10 rotas. Formulários inteiros dependiam só de `placeholder`: `/launch`
  5/5, `/financial` 2/2, `/showroom` 2/2, `/quality` 8/15, `/inventory` 4/9.
  Para leitor de tela, digitar "Código", "Coleção", "Custo Fixo", "CNPJ" ou
  "Defeito" era indistinguível — e nenhum campo declarava obrigatoriedade.

### Correção metodológica (antes de comparar números)

O levantamento bruto da 29ª contou **31** elementos sem rótulo em 10 rotas.
Um deles é o `BubbleSelect` interno do Radix em `/looks`
(`aria-hidden="true"`, `tabIndex=-1`, 1×1 px, `display` visível mas fora da
árvore de acessibilidade) — **não é exposto a leitor de tela**. Excluindo
`aria-hidden`, `hidden` e `display:none`/`visibility:hidden`, o universo real
é **30 de 66 campos expostos** em 12 rotas. Re-medimos **ANTES** (produção,
Onda 48) e **DEPOIS** (local, Onda 49) com **o mesmo critério**:

| Rota             | ANTES       | DEPOIS     | `aria-required` |
| ---------------- | ----------- | ---------- | --------------- |
| `ai-agents`      | 1 / 1       | **0**      | 0               |
| `collection-map` | 0 / 2       | **0**      | 0               |
| `display`        | 1 / 2       | **0**      | 0               |
| `financial`      | 2 / 2       | **0**      | 0               |
| `inventory`      | 4 / 9       | **0**      | 0               |
| `launch`         | 5 / 5       | **0**      | **4**           |
| `looks`          | 4 / 5       | **0**      | 0               |
| `quality`        | 8 / 15      | **0**      | **2**           |
| `references`     | 1 / 1       | **0**      | 0               |
| `research`       | 2 / 4       | **0**      | 0               |
| `showroom`       | 2 / 2       | **0**      | 0               |
| `orders` (47)    | 0 / 18      | **0**      | 0               |
| **TOTAL**        | **30 / 66** | **0 / 66** | **0 → 6**       |

---

## 3. O que foi entregue

**31 marcadores em 11 arquivos**: `id`/`htmlFor` onde já existia rótulo visível
(14 pares), `aria-label` nos demais (16 campos expostos + 1 `SelectTrigger` do
Radix), e `aria-required="true"` nos **6 obrigatórios declarados** — 4 em
`/launch` (`<Label required>`) e 2 em `/quality` (campos com `capaErrors`).

| Arquivo                                              | Campos | Correção                                                                                |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `src/routes/_authenticated.ai-agents.tsx`            | 1      | `aria-label` dinâmico por agente                                                        |
| `src/routes/_authenticated.display.tsx`              | 1      | buscar ficha/referência                                                                 |
| `src/routes/_authenticated.financial.tsx`            | 2      | `custo-fixo-colecao`, `teto-otb-materia-prima`                                          |
| `src/components/inventory/FabricRollsShadePanel.tsx` | 4      | cód. rolo, partida, nuance, peso                                                        |
| `src/routes/_authenticated.launch.tsx`               | 5      | código, coleção, início/fim de janela, notas + 4 `aria-required`                        |
| `src/routes/_authenticated.looks.tsx`                | 5      | buscar, REF, nome, papel (Radix), cor                                                   |
| `src/routes/_authenticated.quality.tsx`              | 8      | busca, status, defeito, setor, tipo, severidade, responsável, prazo + 2 `aria-required` |
| `src/routes/_authenticated.references.tsx`           | 1      | buscar referência                                                                       |
| `src/components/research/MoodBoard.tsx`              | 1      | URL da imagem de referência                                                             |
| `src/components/research/AiCroquiPanel.tsx`          | 1      | descrição para croqui                                                                   |
| `src/routes/_authenticated.showroom.tsx`             | 2      | lojista/razão, CNPJ                                                                     |

Teste novo: `src/lib/onboarding/onda49-campos.test.ts` (5 asserções) guarda os
31 marcadores, os 6 `aria-required`, as guardas das Ondas 47/48 e o SHA-256 do
SQL aplicado. **Nenhuma asserção antiga foi relaxada.**

### O que **não** mudou

- Nenhum `required` nativo novo: as validações em JS (`waveErrors`,
  `capaErrors`) seguem donas do fluxo e não são atropeladas pela validação do
  browser.
- Nenhum handler, store, cálculo, emissor de documento ou guarda de vitrine
  foi alterado. `podeEmitirFichaCega()`, `podeEmitirMediaKit()`,
  `linhasApuraveis()` e `podeEmitirLineSheet()` permanecem.
- `APLICAR-ONDA-21-24.sql` permanece com 473 linhas e SHA-256
  `382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`.

---

## 4. Prova por cliques (browser local, Onda 49)

| Tarefa                                               | Resultado                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/launch` → "Criar" com formulário vazio             | **4** `aria-invalid="true"`, mensagens `Informe o código da wave.` / `Informe a coleção.` **preservadas** |
| `/quality` → "Abrir CAPA" vazio                      | **2** `aria-invalid="true"`, validação **preservada**                                                     |
| `/financial` → preencher os 2 campos agora rotulados | `95000` / `180000` lidos de volta por `get_by_label`                                                      |
| `/showroom` → preencher lojista e CNPJ               | `Lojista Onda 49` / `12345678000199`                                                                      |
| `/inventory` → preencher cód. rolo                   | `RL-49`                                                                                                   |
| `/ai-agents` → digitar no textarea                   | `Qual o SAM da peça?`                                                                                     |

Capturas: `/home/user/onda49-launch-depois.png`,
`/home/user/onda49-quality-depois.png`.

---

## 5. Gates e 31ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos de antes) ·
`prettier --check .` **limpo** · `vitest` **686/686** (681 + 5).

| Camada        | 31ª medição (após fechar a Onda 49)                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 49** — este commit                                                                                   |
| App publicado | **Onda 48** — `index-DPV0JUG6.js` / `index-DnKqdFO4.js`, 6 marcadores da 48 = 1, **6 marcadores da 49 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                        |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 49 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece (não prometida como feita)

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
