# Onda 52 — Todo campo de diálogo tem nome (36ª e 37ª medições, 06/11/2026)

> **`publicado, prossiga` = dois comandos.** Re-medir o marco (nunca confirmar
> cegamente) e escolher a onda seguinte pelo risco, sem perguntar. Este
> documento é uma **medição**, não um plano.

---

## 1. 36ª medição — a Onda 51 foi publicada e validada por cliques

BFS: entry **novo** `index-BVDv6rFg.js` / `index-VytO5e2k.js`, **224 chunks /
3.181.542 bytes**, 0 falhas; `index-Ctoln0KB.js` = 0. `colecoes-so-vitrine` 1,
`cta-colecoes-sem-colecao` 1, `Só há coleções de demonstração` 1, `Cadastrar
coleção` 1; marcadores das Ondas 50 e 48/49 intactos, `DEV000006` 20.
(`COLECOES_SEM_APURACAO`/`colecao-name` = 0 é minificação/constante; a prova
são os textos de tela.)

**Cliques reais em produção:** `/collections` com aviso 1 + CTA 1, `Exportar`
**`disabled=True`**, 6 travessões no cabeçalho, clique forçado → **0 downloads,
0 popups, 0 toasts**; **0 campos sem nome na tela** e **0 no diálogo "Nova
coleção"** (7 `label[for]`). Banco: view `200 []`, 4 funções `401 42501`, SQL
SHA `382f0f19…` inalterado. **Repo, ar e banco alinhados na Onda 51.**
Captura `/home/user/medicao36-collections.png`.

---

## 2. Como a Onda 52 foi escolhida

A Onda 51 tinha revelado que a Onda 49 mediu **apenas campos montados na carga
inicial** — o diálogo "Nova coleção" passou fora. Então a varredura de risco
desta rodada **abriu os diálogos** das 44 rotas com clique real em produção
(botões `Novo`/`Adicionar`/`Cadastrar`/`Criar`/`Editar`/`Converter`, até 4 por
rota), medindo `input, select, textarea` expostos dentro de `[role=dialog]`.

**ANTES (produção, Onda 51): 19 diálogos em 13 rotas, 107 campos sem nome
acessível.**

| Rota          | Diálogo                                      | Campos sem nome        |
| ------------- | -------------------------------------------- | ---------------------- |
| `cad`         | Cadastrar Molde / Estudo de Encaixe          | 11                     |
| `catalog`     | Novo produto do catálogo                     | 9                      |
| `colors`      | Nova cor na paleta                           | 4                      |
| `commercial`  | Cadastrar Novo Lojista B2B                   | 5                      |
| `development` | Nova Referência na Esteira PLM               | 4                      |
| `looks`       | Novo look                                    | 5                      |
| `marketing`   | Planejar Novo Drop GTM / Editar Drop         | 10 (×2, mesmo diálogo) |
| `prints`      | Nova versão da estampa                       | 4                      |
| `prototypes`  | Nova Solicitação de Peça Piloto / Editar     | 5 (×2)                 |
| `research`    | Novo Briefing Criativo                       | 11                     |
| `security`    | Registrar Evidência Manual                   | 2                      |
| `suppliers`   | Homologar Novo Fornecedor / Facção           | 10                     |
| `tech-sheet`  | Duplicar Base de Engenharia / NOVA APLICAÇÃO | 2 + 10                 |

Já estavam corretos: `collections` (Onda 51), `orders` (Onda 47),
`references` (Onda 49). `digital-twin` não respondeu ao `h1` no tempo limite —
artefato conhecido do crawler, não confirmado como bug.

Os emissores de documento e os KPIs de vitrine já estavam fechados pelas Ondas
47–51; **o risco remanescente medido era de acessibilidade em formulários
operacionais** — o usuário de leitor de tela não sabia o que digitar em
"Referência PLM", "Técnica", "Posição", "CNPJ do lojista", "Briefing", etc.

---

## 3. O que foi entregue

**114 `aria-label` novos em 14 arquivos** (13 rotas +
`src/components/techsheet/AplicacoesPanel.tsx`), derivados do `<Label>` /
`<label>` visível imediatamente anterior; onde só havia `placeholder`, o texto
foi reescrito à mão para ser descritivo. Nenhum `id` foi inventado, nenhum
`<Label>` foi alterado, nenhum handler, validação, store ou cálculo mudou.

| Arquivo                                    | `aria-label`                                     |
| ------------------------------------------ | ------------------------------------------------ |
| `_authenticated.cad.tsx`                   | 11                                               |
| `_authenticated.catalog.tsx`               | 19                                               |
| `_authenticated.colors.tsx`                | 4                                                |
| `_authenticated.commercial.tsx`            | 5                                                |
| `_authenticated.development.tsx`           | 4                                                |
| `_authenticated.looks.tsx`                 | 6 (5 campos + `SelectTrigger` "Ocasião do look") |
| `_authenticated.marketing.tsx`             | 10                                               |
| `_authenticated.prints.tsx`                | 4                                                |
| `_authenticated.prototypes.tsx`            | 7                                                |
| `_authenticated.research.tsx`              | 11                                               |
| `_authenticated.security.tsx`              | 2                                                |
| `_authenticated.suppliers.tsx`             | 10                                               |
| `_authenticated.tech-sheet.tsx`            | 10                                               |
| `components/techsheet/AplicacoesPanel.tsx` | 11                                               |

Textos reescritos: `Nome do look`, `Coleção do look`, `Cor do look`, `Tags do
look, separadas por vírgula`, `Pontos de bordado (milhares)`, `Número de cores
da aplicação`. Zero ocorrência de `aria-label="Campo do formulário"`,
`"opcional"` ou de placeholder cru como nome.

> **Nota de medição:** o inventário estático achou 98 campos e a varredura com
> cliques achou 107. A diferença vem de diálogos cujo conteúdo está em
> componente separado (`AplicacoesPanel`) ou em `DialogContent` fora do
> `<Dialog>` (`looks`). A correção foi aplicada aos dois e **re-medida com
> cliques**, não presumida pelo inventário.

Teste novo: `src/lib/onboarding/onda52-dialogos-tem-nome.test.ts` (8 asserções)
— cobertura dos 14 arquivos, 114 rótulos, nomes descritivos, guardas 47–51,
`id`/`htmlFor` da Onda 51, campos das Ondas 47/49 e SHA do SQL. **Nenhuma
asserção antiga foi relaxada.**

---

## 4. Prova por cliques reais (browser local, Onda 52)

Mesmo script, mesmas 44 rotas, mesmo critério de exposição
(`aria-hidden`/`hidden`/`display:none` excluídos), agora contra
`127.0.0.1:8080`:

|                               | Diálogos abertos | Campos sem nome | Rotas com problema |
| ----------------------------- | ---------------- | --------------- | ------------------ |
| **ANTES** (produção, Onda 51) | 19               | **107**         | 13                 |
| **DEPOIS** (local, Onda 52)   | 19               | **0**           | **0**              |

`cad`, `catalog`, `collections`, `colors`, `commercial`, `development`, `looks`,
`marketing` (criar + editar), `orders`, `prints`, `prototypes` (criar + editar),
`references`, `research`, `security`, `suppliers`, `tech-sheet` (duplicar +
nova aplicação): todos **0**. `digital-twin` segue sem `h1` no tempo limite do
crawler (artefato registrado, sem mudança de comportamento).

---

## 5. Gates e 37ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **710/710** (702 + 8).

| Camada        | 37ª medição (após fechar a Onda 52)                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 52** — este commit                                                                                                    |
| App publicado | **Onda 51** — `index-BVDv6rFg.js` / `index-VytO5e2k.js`, 224 chunks / 3.181.542 bytes, **7 marcadores exclusivos da 52 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                         |

> `Arte (cartela de estampas)` = 1 no bundle **não é marcador da Onda 52**: é
> o texto do `<Label>` que já existia. Os marcadores exclusivos são `Nome do
look`, `Coleção do look`, `Cor do look`, `Tags do look, separadas por
vírgula`, `Ocasião do look`, `Pontos de bordado (milhares)` e `Número de
cores da aplicação` — todos **0** no ar.

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 52 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- Os painéis `CollectionROI`/`CollectionPerformance` de `/collections`
  continuam calculando sobre lotes e bases de exemplo (`ticketMedio = 320`,
  `INVEST_BASE`); declarados no aviso, mas ainda simulação, não apuração.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Diálogos que **não** abrem por botão de criação (drawers, sheets, menus) não
  foram cobertos por esta varredura; `digital-twin` não foi medido por timeout
  do crawler.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
