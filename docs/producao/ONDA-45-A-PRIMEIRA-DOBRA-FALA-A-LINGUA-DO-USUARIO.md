# Onda 45 — A primeira dobra fala a língua do usuário

**Data:** 06/11/2026 · **Commit:** `65df431` · **Antecessor:** `239c43c` (Onda 44 + docs)

---

## 1. Continuação da frente de UX

Depois de "Comece por aqui" (Onda 43) e de dar saída aos 9 avisos (Onda 44),
o atrito restante medido era **de compreensão, não de navegação**. Varredura no
DOM de **35 rotas** com Chromium headless:

| Sigla                                      | Telas onde aparece |
| ------------------------------------------ | ------------------ |
| `BOM`                                      | 12                 |
| `PCP`                                      | 10                 |
| `DPP`                                      | 5                  |
| `SAM`                                      | 5                  |
| `ESG` / `MRP` / `CFOP`                     | 4 cada             |
| `RFQ` / `SEFAZ` / `AQL` / `NCM` / `Kanban` | 3 cada             |

O **dashboard sozinho tem 15 siglas na primeira dobra**, precedidas por
_"Torre Executiva PLM 2.0 · Engenharia, Sourcing, Corte, ESG & CFO"_. Para quem
já opera, é preciso. Para quem chegou hoje, é uma parede: o usuário precisa
decifrar o vocabulário antes de entender o que o sistema faz.

Havia também uma promessa incondicional: o card de expedição dizia
**"Packing List & XML SEFAZ prontos"** mesmo sem nenhuma ficha salva — o mesmo
tipo de frase que a Onda 37 removeu de outros painéis.

### Falso positivo evitado

A primeira varredura apontou **3 rotas sem `<h1>`**: `/tech-sheet`,
`/production` e `/analytics`. Re-medindo com `wait_for_selector("h1")` e 12 s
de espera, as duas últimas **apareceram** (`PCP — Lotes & Passagens` e
`BI Executivo`): eram timeouts de carregamento, não ausência real. Só
**`/tech-sheet`** não tem `<h1>` — e justamente no early-return do estado
vazio, a primeira tela de quem não tem ficha. Corrigir só o que existe é parte
do método desde a 4ª medição.

---

## 2. O que mudou

### Glossário em um só lugar

`src/lib/onboarding/glossario.ts` — **24 termos** com nome por extenso e uma
frase em português simples, cobrindo as 12 siglas mais frequentes medidas.
`src/components/onboarding/GlossarioTermos.tsx` renderiza um `<details>`
colapsado com `<dl>/<dt>/<dd>` e `aria-label`: quem já opera não perde espaço,
quem chegou hoje abre em **1 clique**. O `data-testid="glossario-termos"`
permite medir a cobertura no bundle.

Os nomes dos módulos **não mudaram** — eles apontam para rotas reais e são
usados por testes. O que mudou:

| Antes                                                              | Depois                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "Torre Executiva PLM 2.0 · Engenharia, Sourcing, Corte, ESG & CFO" | **"Ferramentas do produto"** + _"Da ficha técnica ao custo, ao corte, aos documentos e à venda."_ |
| `aria-label="Pulso Industrial PLM 2.0"`                            | `aria-label="Ferramentas do produto"`                                                             |
| 5 links técnicos sem explicação                                    | 5 links com `title={tituloTermo(...)}` (BOM, What-If, RFQ, GSD)                                   |
| 15 siglas sem tradução                                             | **17 termos explicados** no glossário                                                             |
| "Packing List & XML SEFAZ prontos"                                 | **"quando houver ficha salva"**                                                                   |

### Hierarquia de título

`/tech-sheet`: o `<h2>` do estado vazio foi promovido a `<h1>` visível, e o
cockpit com ficha ganhou `<h1 className="sr-only">Ficha técnica · {ref}</h1>`
(o título visual dali é um `<input>` editável, que não pode ser `h1`). O
`data-testid="cockpit-sem-ficha"` foi preservado.

---

## 3. Validação executada no browser

```
/dashboard
  h1 = "Da ideia ao produto industrial."
  "Torre Executiva PLM 2.0"            : 0
  "Ferramentas do produto"             : 1
  glossario-termos                     : 1, colapsado por padrao
  termos explicados (dt)               : 17
  links tecnicos com title             : 5
  exemplo: "Lista de materiais: A lista de todos os tecidos, aviamentos..."
  clique no summary                    : aberto, "BOM" visivel
  "Packing List & XML SEFAZ prontos"   : 0

/tech-sheet (estado vazio, sem ficha salva)
  h1 = "Nenhuma ficha técnica salva"   (antes: nenhum h1)
  cockpit-sem-ficha                    : 1
```

---

## 4. O que não mudou

- Nenhum número operacional, nenhum filtro de vitrine, nenhuma asserção das
  Ondas 38–44 relaxada.
- Os `—` continuam; o onboarding e os 9 CTAs da Onda 44 seguem intactos.
- `PASSOS` continua com 4 passos e as mesmas rotas.
- SQL 163/163 inalterado; banco sem as migrações 21/24.
- O glossário não grava estado, não usa `localStorage` e não cria contador.

---

## 5. Gates

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **642/642** (eram 624; **+18**)    |

**18 testes novos**: 6 da função pura do glossário (cobertura das 12 siglas
mais frequentes, sem duplicatas, case-insensitive, explicações auto-contidas),
6 de render em `jsdom` (`details` colapsado, `dl/dt/dd`, termos em português,
subconjunto reutilizável, sigla desconhecida ignorada, `testId` custom), 3
guardas da primeira dobra e 3 de hierarquia/estado vazio.

Um teste **falhou primeiro** e revelou dado faltante: `PCP` (2ª sigla mais
frequente, 10 telas) não estava em `TERMOS_PRIMEIRA_DOBRA`. Corrigimos o
**dicionário**, não o teste.

---

## 6. Medição das camadas — 22ª (06/11)

O ar **parou** pela primeira vez desde a 18ª medição: permanece
**`index-BuzojJqi.js`** (221 chunks) = **Onda 43**. `cta-supplier-so-vitrine`
e `CtaProximoPasso` = **0** → a **Onda 44 não foi publicada**.

| Camada        | Estado                                                            |
| ------------- | ----------------------------------------------------------------- |
| Repositório   | **Onda 45** (este commit)                                         |
| App publicado | **Onda 43** — `index-BuzojJqi.js`, **duas ondas** atrás (44 e 45) |
| Banco         | sem migrações 21/24 — `PGRST205` + 3× `PGRST202`                  |

`glossario-termos`, `Ferramentas do produto` e
`O que significam essas siglas` = **0** no bundle; `"Torre Executiva PLM 2.0"`
ainda **1**. `DEV000006` segue em **27** ocorrências.

---

## 7. Próximos passos sugeridos

1. **Formulários longos** — `/orders` tem 18 inputs e 62 botões; o padrão de
   3 seções numeradas de "Nova referência" pode ser replicado. É o próximo
   atrito de dificuldade real, mas exige cuidado com o fluxo operacional.
2. **Levar o glossário às telas internas** — `<GlossarioTermos siglas={[...]} />`
   já aceita subconjunto; `/audit` tem 11 siglas e `/route-engineering` 4.
3. **Publicar as Ondas 44 e 45**, aplicar `APLICAR-ONDA-21-24.sql` (3
   NOTICEs) e fornecer `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` para que os specs
   autenticados deixem de ser `skipped`.
