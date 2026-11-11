# Onda 56 — `/digital-twin` tem título também sem ficha salva (46ª e 47ª medições, 06/11/2026)

> **`lovable publicado, prossiga` = dois comandos.** Re-medir o marco (nunca
> confirmar cegamente) e escolher a onda seguinte pelo risco, sem perguntar.
> Este documento é uma **medição**, não um plano.

---

## 1. 46ª medição — a Onda 55 foi publicada e validada por cliques

BFS: entry **novo** `index-BlLjcjGi.js` / `index-CfT3W1YT.js`, **223 chunks /
3.188.613 bytes**, 0 falhas; `index-CgpxQvgj.js` = 0. Os **5 marcadores
exclusivos da Onda 55 = 1** (`Causa-raiz da CAPA`, `Novo porquê da CAPA`,
`Eficácia verificada da CAPA`, `URL da evidência da CAPA`, `Nota da transição
da CAPA`); marcadores 54 e 48/49 intactos, `DEV000006` 20.

**Cliques reais em produção:** `/quality` com 0 campos sem nome na carga
inicial, "Abrir CAPA" vazio → **2** `aria-invalid`, criação válida → toast
`CAPA aberta`, e o drawer com **0 campos sem nome nas 4 abas** (Investigação 7,
Ações 5, Evidências 3, Timeline 1). Banco: view `200 []`, 4 funções
`401 42501`, SQL SHA `382f0f19…` inalterado. **Repo, ar e banco alinhados na
Onda 55.** Captura `/home/user/medicao46-quality.png`.

---

## 2. Como a Onda 56 foi escolhida

Varredura de **títulos de página** nas 43 rotas, com espera fixa de 2,5 s e
**sem** `wait_for_selector` (para não confundir timeout com ausência):

| Medida           | Resultado               |
| ---------------- | ----------------------- |
| Rotas com `<h1>` | **42**                  |
| Rotas sem `<h1>` | **1 — `/digital-twin`** |

**Correção de diagnóstico:** desde a Onda 31, `h1 = 0` em `/digital-twin` era
registrado como "artefato do crawler". A medição dirigida mostrou que não é:
`h1 = 0`, `h2 = 1`, body ~1.034 caracteres (só sidebar + aviso), nenhum
`pageerror`, apenas `data-testid="gemeo-sem-ficha"` e 401/403 de sessão
simulada. A rota, quando não há ficha salva, devolvia **apenas um `<Card>` com
`<h2>`**, sem o `<header>` com `<h1>` que o caminho normal renderiza. O estado
de vitrine estava correto (não apura nada), mas a página ficava **sem título** —
para leitor de tela, SEO e qualquer medição automatizada.

A varredura de botões-ícone das 44 rotas (o falso negativo da Onda 55) não
achou novos drawers com campos sem nome: 0 containers abertos com campos.

---

## 3. O que foi entregue

**`src/routes/_authenticated.digital-twin.tsx`** — no retorno antecipado
`if (!doc || !sim)`:

- Mesmo `<header>` do caminho normal: badge `PLM Digital Twin · Tempo Real` e
  **`<h1>Gêmeo Digital & Simulador What-If</h1>`** com a descrição.
- KPIs de ausência em **`—`**: `Simulação What-If — · Render IA — · Tiragem
planejada —` (não zero apurado).
- **Duas saídas clicáveis**: o Link original `Abrir Ficha Técnica` →
  `/tech-sheet`, agora com `data-testid="cta-gemeo-abrir-ficha"`, e um
  `CtaProximoPasso passo="ficha"` com `testId="cta-gemeo-sem-ficha"`.
- `data-testid="gemeo-sem-ficha"` preservado no Card.

**O que NÃO mudou:** o caminho normal (header, select de fichas,
`simulateDigitalTwinScenario`, 7 cards), a guarda da Onda 31
(`useOperationalRefs` / `useSelectedRef`; `ensure()` e `DEV000006` só em
comentário), nenhum store, cálculo, emissor ou guarda das Ondas 47–55, e o SQL
aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`).

Teste novo: `src/lib/onboarding/onda56-digital-twin-h1.test.ts` (7 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 56)

| Medida                              | ANTES (produção, 46ª) | DEPOIS (local, 47ª)                                    |
| ----------------------------------- | --------------------- | ------------------------------------------------------ |
| `<h1>` em `/digital-twin` sem ficha | **0**                 | **1** — `Gêmeo Digital & Simulador What-If`            |
| `gemeo-sem-ficha`                   | 1                     | 1                                                      |
| CTAs                                | 0                     | **2** (`cta-gemeo-abrir-ficha`, `cta-gemeo-sem-ficha`) |
| KPIs em `—`                         | 0                     | **3**                                                  |
| Clique "Abrir Ficha Técnica"        | —                     | navega para **`/tech-sheet`**                          |

**Promoção real por cliques:** `/research` → "Converter em Ficha Técnica" →
toast `Ficha Técnica CR27-101 gerada…` → link **Digital Twin** na sidebar
(navegação SPA, preservando o store) → **`/digital-twin` com `h1 = 1`,
`gemeo-sem-ficha = 0`, 7 cards e o select de fichas presente**. O caminho
normal não regrediu. Capturas `/home/user/medicao47-digital-twin-antes.png` e
`medicao47-digital-twin-depois.png`.

---

## 5. Gates e 47ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **740/740** (733 + 7).

| Camada        | 47ª medição (após fechar a Onda 56)                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 56** — este commit                                                                                                    |
| App publicado | **Onda 55** — `index-BlLjcjGi.js` / `index-CfT3W1YT.js`, 223 chunks / 3.188.613 bytes, **3 marcadores exclusivos da 56 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                         |

> `Tiragem planejada` = 2 e `Gêmeo Digital & Simulador What-If` = 2 no bundle
> **não são marcadores da Onda 56**: são textos já existentes do caminho
> normal. Os exclusivos são `cta-gemeo-sem-ficha`, `cta-gemeo-abrir-ficha` e
> `Simulação What-If` — todos **0** no ar.

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 56 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- `criarLote()` segue sem chamador na UI (código morto no store PCP); o caminho
  oficial é `/orders → Liberar p/ PCP`.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- `CollectionROI` continua estimativa de referência (declarada), não BI/fiscal;
  o PLM deliberadamente não é ERP.
- Drawers acionados por ícone: a varredura não achou novos campos sem nome, mas
  não cobre painéis que exigem sequência de cliques ou dados prévios.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
