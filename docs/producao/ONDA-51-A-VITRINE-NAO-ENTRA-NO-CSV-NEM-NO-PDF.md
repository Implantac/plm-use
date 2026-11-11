# Onda 51 — A vitrine não entra no CSV nem no PDF de coleções (34ª e 35ª medições, 06/11/2026)

> **`publicado, prossiga` = dois comandos.** Primeiro re-medir o marco de
> publicação (nunca confirmar cegamente); depois escolher a onda seguinte pelo
> risco, sem perguntar. Este documento é uma **medição**, não um plano.

---

## 1. 34ª medição — a Onda 50 foi publicada, validada por cliques

O dono relatou "publicado". A medição **não confirmou cegamente**:

- BFS achou entry **novo** `index-Ctoln0KB.js` / `index-QjNtTEcp.js`,
  **224 chunks / 3.179.918 bytes**, 0 falhas; `index--_hvA3Zc.js` = 0.
- Marcadores da Onda 50: `mrp-sem-apuracao` 1, `cta-mrp-sem-pedido` 1,
  `crp-sem-op` 2, `cta-crp-sem-op` 1, os dois motivos 2 cada. Os nomes
  `podeEmitirMrp`/`podeEmitirCrp` = 0 são esperados (minificação); a prova são
  os marcadores de tela. Marcadores 48/49 inalterados, `DEV000006` 20.
- **Cliques reais em produção:** `/inventory` com aviso 1 + CTA 1, `CSV
Compras ERP` e `Requisição MRP A4` **`disabled=True`** com `title` explicando
  o motivo; `/planner` com aviso 1 + CTA 1 e `Mapa CRP A4`
  **`disabled=True`**. Clique forçado nos 3 → **0 popups, 0 downloads, 0
  toasts**; KPIs em `—` (4 em `/inventory`, 12 em `/planner`).

**Repo, ar e banco alinhados na Onda 50.** Banco re-medido: view `200 []`,
4 funções `401 42501` (assinaturas corretas), SQL SHA-256 `382f0f19…`
inalterado. Capturas `/home/user/medicao34-inventory.png` e
`medicao34-planner.png`.

---

## 2. Como a Onda 51 foi escolhida

Com as três camadas alinhadas, a varredura de risco em produção mediu
`/collections`:

| Medida                 | Resultado (produção, Onda 50)                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Avisos/CTAs de vitrine | **nenhum** (`[]`)                                                                            |
| KPIs na tabela         | `8 refs / 1.490 produzidas / R$ 476.800 / ROI 69% / ROAS 2,29×`; `Pré-Verão 2026` com `-70%` |
| `Exportar`             | habilitado                                                                                   |
| `Baixar CSV`           | **`colecoes-2026-11-11.csv` com 3 coleções de fábrica** + toast `CSV exportado / 3 linhas`   |
| `Imprimir / PDF`       | **A4 com os mesmos 3 registros**, sem marcação de demonstração                               |

Conteúdo exportado: `Verão 25 - Amalfi` (`R$ 1,8 mi`, `24.000 peças`, `68%`,
`186/142` refs, `ROI 3.4x`), `Urban Resort` (`R$ 920 mil`, `16.500 peças`,
`ROI 2.7x`), `Essentials Atemporal` (`R$ 640 mil`, `11.200 peças`,
`ROI 4.1x`). O subtítulo do `ModuleLayout` até avisava que coleções de exemplo
trazem KPIs de demonstração — **o arquivo não avisava**.

> **Correção de diagnóstico:** a primeira leitura do clique em `Exportar`
> registrou 0 popups / 0 downloads / 0 toasts e sugeria um "botão morto".
> Estava errado: `Exportar` é o `ExportMenu` (DropdownMenu do Radix) com
> **"Baixar CSV"** e **"Imprimir / PDF"**. Foi preciso clicar nos `menuitem`
> para revelar os documentos. O bug não é inércia — é **vitrine virando
> documento operacional**, exatamente o padrão das Ondas 47/48/50.

Evidências: `/home/user/medicao34-colecoes-antes.csv`,
`medicao34-colecoes-antes.txt`, `medicao34-collections-risco.png`,
`medicao34-colecoes-menu.png`.

---

## 3. O que foi entregue

**`src/lib/collections/store.ts`**

- `demo?: boolean` no tipo `Collection`; **`demo: true` nas 3 do
  `collectionsSeed`**; ausência da flag = salvo, nunca vitrine.
- `upsertCollection()` **promove** para `demo: false` em qualquer criação ou
  edição humana (Onda 39). `replaceAllCollections()` (hidratação do servidor)
  continua operacional e não foi alterada.
- `colecoesOperacionais(list)`, `podeExportarColecoes(list)` e
  `COLECOES_SEM_APURACAO` — funções puras de elegibilidade, como na Onda 50.

**`src/routes/_authenticated.collections.tsx`**

- `ExportMenu` recebe `rows={operacionais.map(...)}` — com zero linhas o
  próprio componente compartilhado já desabilita o botão.
- Os **4 KPIs do cabeçalho** viram `—` quando só há vitrine (inclusive a meta
  `R$ 3,36 mi`, que era literal de fábrica).
- Aviso `colecoes-so-vitrine` + CTA `cta-colecoes-sem-colecao` abrindo o
  diálogo "Nova coleção", declarando também que os painéis de ROI/ROAS abaixo
  são simulações sobre lotes de exemplo.
- **35ª medição:** os **7 campos do diálogo** "Nova coleção" tinham `<Label>`
  sem `htmlFor` e `<Input>` sem `id` — **7/7 sem nome acessível**, dívida que a
  Onda 49 não alcançou porque mediu só campos montados na carga inicial.
  Corrigidos com `id={`colecao-${key}`}` / `htmlFor={`colecao-${key}`}`:
  **7/7 → 0/7**, leitura por `get_by_label` funcionando.

**O que NÃO mudou:** `filterCollections`, o `ExportMenu` compartilhado, o
store mutável/`creative-sync`, as validações do formulário, as guardas das
Ondas 47/48/49/50 e o SQL aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`). Os 36
testes de `creative-sync`/`filter` seguem verdes. Nenhuma asserção antiga foi
relaxada.

Teste novo: `src/lib/onboarding/onda51-colecoes-vitrine.test.ts` (8 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 51)

| Tarefa                                | Resultado                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/collections` só com vitrine         | aviso 1, CTA 1, `Exportar` **`disabled=True`**, 6 travessões                                                                                                        |
| Clique forçado em `Exportar`          | **0 downloads, 0 popups, 0 toasts**                                                                                                                                 |
| CTA → diálogo "Nova coleção"          | aberto; **7 campos sem nome** medidos **antes** da correção, **0 depois**; 7 `label[for]` + 7 `input[id]`                                                           |
| Preencher 7 campos → "Salvar coleção" | toast `Nova coleção criada`; aviso **0**, `Exportar` **habilitado**                                                                                                 |
| `Baixar CSV`                          | **`colecoes-2026-11-11.csv` com 1 linha**: `Outono 27 - Onda 51, Outono / Inverno, 2026, Marca Onda 51, Planejamento, R$ 500 mil, 9.000 peças, 62%, 0, 40, 0, 0.0x` |
| `Imprimir / PDF`                      | A4 **`1 REGISTROS`** com a coleção salva; **nenhuma** das 3 de fábrica (`Amalfi`/`Urban Resort`/`Essentials` ausentes)                                              |

Evidências: `/home/user/medicao35-colecoes-antes.png`,
`medicao35-dialogo-rotulado.png`, `medicao35-colecoes-depois.png`,
`medicao35-colecoes-depois.csv`, `medicao35-colecoes-depois.txt`.

---

## 5. Gates e 35ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **702/702** (694 + 8).

| Camada        | 35ª medição (após fechar a Onda 51)                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 51** — este commit                                                                                         |
| App publicado | **Onda 50** — `index-Ctoln0KB.js` / `index-QjNtTEcp.js`, 224 chunks / 3.179.918 bytes, **6 marcadores da 51 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                              |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 51 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- Os painéis `CollectionROI`/`CollectionPerformance` de `/collections`
  continuam calculando sobre lotes e bases de exemplo (`ticketMedio = 320`,
  `INVEST_BASE`); agora estão **declarados** no aviso, mas seguem como
  simulação, não apuração.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Outros diálogos ainda podem ter campos sem nome acessível: a Onda 49 mediu
  campos montados na carga inicial, esta mediu o de `/collections`.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
