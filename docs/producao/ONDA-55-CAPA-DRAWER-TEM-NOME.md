# Onda 55 — Todo campo do drawer CAPA tem nome (44ª e 45ª medições, 06/11/2026)

> **`projeto publicado no lovable prossiga` = dois comandos.** Re-medir o marco
> (nunca confirmar cegamente) e escolher a onda seguinte pelo risco, sem
> perguntar. Este documento é uma **medição**, não um plano.

---

## 1. 44ª medição — o marco era redundante, não uma nova publicação

O dono relatou "projeto publicado no lovable". A re-medição por camada mostrou
que o ar **não mudou** desde a 43ª medição:

| Medida                | 43ª                                       | 44ª                 |
| --------------------- | ----------------------------------------- | ------------------- |
| Entry                 | `index-CgpxQvgj.js` / `index-CyHoINKY.js` | **o mesmo**         |
| Chunks / bytes        | 223 / 3.188.203                           | **223 / 3.188.203** |
| Marcadores da Onda 54 | 1 cada                                    | **1 cada**          |
| Marcadores 53 / 48/49 | intactos                                  | **intactos**        |
| `DEV000006`           | 20                                        | **20**              |

O entry antigo `index-CFlhwbuy.js` segue zerado. **Não foi confirmada cegamente
uma "nova publicação"**: a publicação da Onda 54 já havia sido detectada por BFS
e validada por cliques na 43ª medição. Repo `c2a2b5d` (limpo), banco view
`200 []` / 4 funções `401 42501` / SQL SHA `382f0f19…` inalterado. **Repo, ar e
banco alinhados na Onda 54.**

---

## 2. Como a Onda 55 foi escolhida

Com `prossiga`, a varredura de risco abriu os **drawers/painéis acionados por
clique** — a Onda 49 mediu só campos da carga inicial e a Onda 52 só diálogos
de criação. A varredura genérica de 44 rotas deu 0 (falso negativo: botões
ícone), então a medição foi dirigida ao `CapaDrawer` de `/quality`, que tem 11
campos.

**ANTES (produção, clique real para criar/abrir a CAPA):**

| Aba          | Campos expostos | Sem nome acessível |
| ------------ | --------------- | ------------------ |
| Investigação | 7               | **7**              |
| Ações        | 5               | **5**              |
| Evidências   | 3               | **3**              |
| Timeline     | 1               | **1**              |

A nota de transição aparece no footer em todas as abas, por isso é contada em
cada uma. Exemplos medidos: `INPUT[text]` sem placeholder, `INPUT[date]`,
`SELECT` de severidade/eficácia, `TEXTAREA` "Descreva a causa-raiz
identificada", `INPUT` "Porquê #1", `INPUT` "URL da evidência (foto, laudo,
doc)", `TEXTAREA` "Nota da transição (opcional)".

**Causa no código:** `Field` renderiza `<label>` **irmão** do campo, sem
`htmlFor`/`id`; `closest('label')` não encontra nada. Os campos avulsos
(porquê, evidências, nota de transição) também não tinham `aria-label`.

---

## 3. O que foi entregue

**11 `aria-label` em `src/components/quality/CapaDrawer.tsx`**, um por ponto do
código:

| Campo                                         | Rótulo                           |
| --------------------------------------------- | -------------------------------- |
| Causa-raiz                                    | `Causa-raiz da CAPA`             |
| Novo porquê                                   | `Novo porquê da CAPA`            |
| Eficácia verificada                           | `Eficácia verificada da CAPA`    |
| URL da evidência                              | `URL da evidência da CAPA`       |
| Descrição da evidência                        | `Descrição da evidência da CAPA` |
| Nota da transição                             | `Nota da transição da CAPA`      |
| `ActionField` (3 instâncias)                  | `` `${label} da CAPA` ``         |
| Responsável / Prazo / Severidade / Fornecedor | `… da CAPA` / `… pela CAPA`      |

> **Decisão de implementação:** **não** trocamos o `<div>` do `Field` por
> `<label>` wrapper. Alguns `Field` envolvem `<div>` com botões (5 Porquês,
> evidências) e um `<label>` com botão dentro é HTML problemático — clicar no
> botão focaria o primeiro campo. `aria-label` é determinístico e não altera
> estrutura, handlers, `persistPatch`, `setLocal`, `onSave` nem as abas.

**O que NÃO mudou:** as validações de `/quality` (Onda 49: 2 `aria-invalid` e
`capaErrors`), as guardas das Ondas 47–54, nenhum store, cálculo ou emissor, e
o SQL aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`).

Teste novo: `src/lib/onboarding/onda55-capa-drawer.test.ts` (7 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 55)

| Medida             | ANTES (produção)    | DEPOIS (local)                    |
| ------------------ | ------------------- | --------------------------------- |
| Investigação       | 7 / 7 sem nome      | **7 campos, 0 sem nome**          |
| Ações              | 5 / 5               | **5 campos, 0**                   |
| Evidências         | 3 / 3               | **3 campos, 0**                   |
| Timeline           | 1 / 1               | **1 campo, 0**                    |
| "Abrir CAPA" vazio | 2 `aria-invalid`    | **2 `aria-invalid`** (preservado) |
| Criar CAPA válida  | toast `CAPA aberta` | toast `CAPA aberta`               |

> **Nota metodológica:** `get_by_label("Causa-raiz da CAPA")` retornou 0 na aba
> Timeline porque o `TabsContent` do Radix **desmonta** a aba inativa; o footer
> (nota de transição) permanece e retornou 1. A medição correta é por aba, não
> por contagem global de rótulos — e todas deram 0 sem nome.

Captura `/home/user/medicao45-quality-drawer.png`.

---

## 5. Gates e 45ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **733/733** (726 + 7).

| Camada        | 45ª medição (após fechar a Onda 55)                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 55** — este commit                                                                                                    |
| App publicado | **Onda 54** — `index-CgpxQvgj.js` / `index-CyHoINKY.js`, 223 chunks / 3.188.203 bytes, **5 marcadores exclusivos da 55 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                         |

> `Responsável pela CAPA` = 1 no bundle **não é marcador da Onda 55**: é o
> `aria-label` do campo de responsável já introduzido pela Onda 49. Os
> marcadores exclusivos são `Causa-raiz da CAPA`, `Novo porquê da CAPA`,
> `Eficácia verificada da CAPA`, `URL da evidência da CAPA` e `Nota da
transição da CAPA` — todos **0** no ar.

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 55 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- `criarLote()` segue sem chamador na UI (código morto no store PCP); o caminho
  oficial é `/orders → Liberar p/ PCP`.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` só aparece em comentários
  (dívida efetivamente fechada); placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- `CollectionROI` continua estimativa de referência (declarada), não BI/fiscal;
  o PLM deliberadamente não é ERP.
- Outros drawers/painéis acionados por ícone não foram cobertos pela varredura
  genérica (que deu falso negativo); `digital-twin` não responde ao `h1` no
  tempo limite do crawler.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
