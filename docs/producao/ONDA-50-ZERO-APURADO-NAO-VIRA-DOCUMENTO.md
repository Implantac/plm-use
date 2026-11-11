# Onda 50 — Zero apurado não vira documento (33ª medição, 06/11/2026)

> **Escolha por risco, sem confirmação.** O `ok prossiga` chegou com repo, ar e
> banco **alinhados na Onda 49**. Em vez de supor o próximo tema, o ambiente
> foi re-medido: varredura de 44 rotas em produção + cliques reais em 16
> emissores. Este documento é uma **medição**, não um plano.

---

## 1. Como a onda foi escolhida

A 32ª medição tinha encerrado a dívida de acessibilidade. Re-probei todos os
emissores habilitados com clique real contra `plmuse.lovable.app`. Quatro
abriam A4:

| Rota         | Emissor               | Resultado do clique (produção, Onda 49)                                                                                                   |
| ------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/ai-agents` | `Imprimir Parecer A4` | ✅ protegido: `sem ficha salva · SAM médio —`, "não apurável"                                                                             |
| `/analytics` | `Book S&OP A4`        | ✅ protegido: 6 travessões + aviso explícito de pedidos/campanhas/OS de demonstração                                                      |
| `/inventory` | `CSV Compras ERP`     | ❌ baixou `mrp-ressuprimento-liquido.csv` **só com o cabeçalho** + toast de **sucesso**                                                   |
| `/inventory` | `Requisição MRP A4`   | ❌ `REQUISIÇÃO AUTOMÁTICA DE RESSUPRIMENTO · ORÇAMENTO TOTAL R$ 0.00`, tabela vazia, **nenhum aviso**                                     |
| `/planner`   | `Mapa CRP A4`         | ❌ 4 setores `0 min` / `0%` com a diretriz "Folga operacional disponível para encaixe de lotes rápidos", fila EDD vazia, **nenhum aviso** |

Os demais emissores estavam `disabled` ou bloqueados por toast (`/commercial`,
`/security`, `/showroom`, `/financial`, `/launch`, `/official-models`).
`/marketing`, `/collection-map` e `/orders` seguem com as guardas das Ondas
47/48. O risco remanescente, portanto, **não era mais um emissor de vitrine**:
era **ausência de dado sendo impressa como zero apurado** — exatamente o que as
Ondas 22/23/27–48 proibiram.

> `capacidade instalada` (6336 / 23616 / 8160 / 10800 min) é configuração de
> fábrica e pode aparecer. `carga 0 min`, `ocupação 0%`, `orçamento R$ 0,00` e
> uma fila EDD vazia são **apuração de uma carteira que não existe**.

---

## 2. O que foi entregue

**Funções puras novas** (decidem emissão; não formatam):

- `podeEmitirMrp(summary)` + `MRP_SEM_APURACAO` em
  `src/lib/inventory/mrp-explosion.ts` — exige `summary.rows.length > 0`.
- `podeEmitirCrp(slots)` + `CRP_SEM_APURACAO` em
  `src/lib/pcp/finite-capacity-planner.ts` — exige `slots.length > 0`.

**Gates nos 3 chamadores** (`MrpNetExplosionPanel.tsx`,
`FiniteCapacityPanel.tsx`): `toast.error(emissao.motivo)` no handler, botões
`disabled={!emissao.pode}` com `title` explicando o motivo, e guarda também
para o caso de o handler ser disparado fora do botão.

**`—` com aviso e CTA, não zero apurado:**

| Antes                                                                  | Depois                                                                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{shortageCount} insumos · Orçamento R$ 0,00`                          | `insumos com compra líquida — · Orçamento —`                                                                                                                   |
| `0%` em 4 badges, `Carga: 0 min`, "Folga operacional disponível"       | `—`, `Carga: —`, "Sem OP/pedido salvo: carga e ocupação não apuráveis"                                                                                         |
| "Sem saldo de almoxarifado para estes insumos" (sugeria haver insumos) | "Sem explosão apurável … os indicadores são travessões, não zero apurado"                                                                                      |
| Tabela MRP vazia e fila EDD vazia                                      | tabelas **não renderizadas**; no lugar, aviso `mrp-sem-apuracao` / `crp-sem-op` com `CtaProximoPasso` (`cta-mrp-sem-pedido`, `cta-crp-sem-op`, passo `pedido`) |

**O que NÃO mudou:** `buildMrpCsv`, `buildMrpPurchaseRequisitionHtml`,
`evaluateFiniteSectorCapacity`, `sequenceOrdersEdd` e
`buildFiniteCapacityScheduleHtml` permanecem **puros e intactos** (mesmo padrão
da Onda 48). O teste novo documenta por que o gate é obrigatório: sem ele, o
formatador ainda produz `R$ 0.00`. Nenhuma asserção antiga foi relaxada, e o
SQL aplicado segue com SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`.

Teste: `src/lib/onboarding/onda50-zero-nao-e-documento.test.ts` (8 asserções)
— MRP/CRP vazios bloqueados, MRP/CRP com dados salvos liberados, pureza dos
formatadores, gate + `disabled` + aviso + CTA nos 3 emissores, guardas 47/48/49
e SHA do SQL.

---

## 3. Prova por cliques reais (browser local, Onda 50)

**ANTES da promoção** (carteira vazia):

| Rota         | Aviso                | CTA | Botões                                             | Clique forçado                      |
| ------------ | -------------------- | --- | -------------------------------------------------- | ----------------------------------- |
| `/inventory` | `mrp-sem-apuracao` 1 | 1   | CSV e A4 **`disabled=True`**, `title` com o motivo | **0 popups, 0 downloads, 0 toasts** |
| `/planner`   | `crp-sem-op` 1       | 1   | Mapa CRP A4 **`disabled=True`**                    | **0 popups, 0 downloads, 0 toasts** |

**Promoção real por cliques** (sem semear nada pelo script):

1. `/research` → "Converter em Ficha Técnica" → ficha **`CR27-101`** salva.
2. `/orders` → "Clonar Pedido" → **`PD-2026-803`**, `demo: false`, ref
   `DEV000006` (toast `Pedido clonado como PD-2026-803 (Recompra B2B)!`).
3. `/tech-sheet` → "Nova Ref." → duplicar base para **`DEV000006`** → ficha
   casada com o pedido (`Base CR27-101 duplicada com sucesso para DEV000006!`).

**DEPOIS da promoção:**

| Medida       | Resultado                                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/planner`   | aviso `crp-sem-op` **0**, botão **habilitado**, A4 com carga **11 / 92 / 38 / 21 min**, ocupação **0,2–0,5%**, `0%` = **0 ocorrências**, fila EDD `1º PD-2026-803 · DEV000006`                           |
| `/inventory` | aviso `mrp-sem-apuracao` **0**, 2 botões **habilitados**, CSV com **3 insumos** (`Malha Dry Fit UV50+…`, `Papel Sublimático…`, `Malha Tricot Linho…`), A4 com **8 linhas de insumo** e `Refs: DEV000006` |

> **Leitura correta do `R$ 0.00` que sobra no A4 depois da promoção:** com
> pedido e ficha **reais**, a compra líquida é zero porque o saldo de
> referência do BOM cobre a necessidade — é **apuração real**, não ausência.
> A Onda 50 não proíbe zero apurado de dado salvo; proíbe **emitir documento
> quando não há dado nenhum**. Antes, o mesmo `R$ 0.00` vinha de `rows = []`.

Capturas/evidências: `/home/user/medicao33-inventory-antes.png`,
`medicao33-planner-antes.png`, `medicao33-inventory-depois.png`,
`medicao33-planner-depois.png`, `medicao33-mrp-depois.csv`,
`medicao33-mrp-depois.txt`, `medicao33-crp-depois.txt`,
`medicao33-doc-*.txt` (documentos **antes**, capturados em produção).

---

## 4. Gates e 33ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **694/694** (686 + 8).

| Camada        | 33ª medição (após fechar a Onda 50)                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 50** — este commit                                                                                         |
| App publicado | **Onda 49** — `index--_hvA3Zc.js` / `index-B-j1IXyJ.js`, 224 chunks / 3.176.611 bytes, **8 marcadores da 50 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                              |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 50 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
