# Onda 46 — a vitrine de CAD e Pilotagem não apura número (e o toast existe)

**Commit de código:** `2ef69b54bd1cebf27c07b956e8bf032c447e3a74` (`2ef69b5`) · **06/11/2026**
**Escolha:** "ok prossiga" → onda escolhida sozinha, **por risco**, sem pedir confirmação.

Com repo, ar e banco finalmente alinhados na 24ª medição, a maior exposição
restante era **`DEV000006` 27× no bundle publicado**. A hipótese não era
"apagar a palavra", mas **medir se algum identificador de fábrica ainda virava
número, documento ou ficha**. Virou — e o teste com clique real ainda revelou
um defeito transversal: **nenhum `toast.*` do app aparecia na tela**.

---

## 1. Medição ANTES (browser headless, sessão local, cliques reais)

Servidor Vite local + Chromium 158, sessão injetada apenas no `localStorage`
(sem escrita no banco). Três rotas, quatro tarefas com clique.

| Rota          | O que o usuário via                                                                                               | Origem do dado                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/cad`        | `MOLDES ATIVOS 2` · `EFICIÊNCIA MÉDIA 86.4%` · `APROVADOS 2`                                                      | 2 estudos de fábrica (`DEV000006`, `V24-001`), sem nenhum molde salvo                                                 |
| `/cad`        | Botão **"Sync + BOM"** ativo na linha do `DEV000006`                                                              | `ensureSheet("DEV000006")` + `setEncaixeCad()` gravava 88,3% / 1,8 m / 5,35 m / 135 g/m² numa ficha que ninguém criou |
| `/cad`        | Formulário "Cadastrar Molde" já com `88.3`, `1.8`, `5.35`, `5`, `135`, `2`, `1.5` e `placeholder="DEV000006"`     | números do mesmo produto de demonstração                                                                              |
| `/prototypes` | `PILOTOS ATIVOS 2` · `AJUSTES ABERTOS 1` · `EVIDÊNCIAS 23` · `LACRADOS 1`                                         | 2 pilotos de fábrica                                                                                                  |
| `/prototypes` | "Novo piloto" com **`DEV000006` já preenchido**; "Prova POM & Lacre" chamava `ensureSheet()` no código de fábrica | `formData.refCode` + `create()` com `                                                                                 |     | "DEV000006"` |
| `/ai-center`  | `<select>` com **0 opções**, valor plantado `DEV000006`, botão "Carregar Ficha" ativo                             | `useState("DEV000006")` apesar de `useOperationalRefs()` devolver vazio                                               |

`DEV000006` aparecia **2× no DOM de `/cad`** e **1× no de `/prototypes`** —
não só no bundle.

### O achado que não estava no plano

Ao clicar em **"Salvar & Sincronizar Ficha"** com o formulário vazio, **nada
aconteceu na tela**: nem mensagem, nem fechamento do diálogo. Investigando:

```
git grep -n "Toaster" -- src
→ apenas src/components/ui/sonner.tsx (a DEFINIÇÃO do componente)
```

O `<Toaster />` **nunca era montado**. O app inteiro chamava
`toast.success/error/warning` (inclusive as validações das Ondas 35–45), mas
todo esse feedback era **silencioso**. Confirmado no browser:
`[data-sonner-toaster]` = 0, `[data-sonner-toast]` = 0.

---

## 2. O que foi entregue

A regra herdada das Ondas 22/23/27–45 continua intacta: **só ficha, pedido,
campanha, OS, lote, evento, briefing, parceiro — e agora molde/piloto —
salvos entram em número ou documento**. A vitrine **não foi apagada**: continua
visível, rotulada e com saída.

### 2.1 Camada de dados

| Arquivo                       | Mudança                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/cad/store.ts`        | `demo?: boolean`; os 2 `initialCadMarkers` com `demo: true`; `MOLDE_DEMO_LABEL`, `moldesOperacionais()`, `promoverMolde()`; `addMarker()` cria com `demo: false`                                                            |
| `src/lib/prototypes/store.ts` | `demo?: boolean`; os 2 `initialPrototypes` com `demo: true`; `PILOTO_DEMO_LABEL`, `pilotosOperacionais()`, `promoverPiloto()`; `create()` **sem** `\|\| "DEV000006"`, com `demo: false` e `image: ""` (sem foto de fábrica) |

### 2.2 Telas

**`/cad`**

- As 4 métricas passam a derivar de `moldesOperacionais(markers)`. Sem molde
  salvo: **`—`** + aviso `cad-so-vitrine` + CTA `cta-cad-sem-molde` (abre o
  diálogo) — nunca `0` apurado.
- `syncToTechSheet()` bloqueia `m.demo === true` **antes** de `ensureSheet()`.
- Linhas de vitrine: selo **"Demonstração · não apurado"** e
  `cad-sync-bloqueado` ("Sync indisponível") no lugar do botão.
- Formulário zerado (`0`, `0`, `0`, `1`, `0`, `0`, `0`), placeholders
  `Ex.: REF-001`, validação de eficiência/largura/comprimento reais antes de
  salvar; `calcMarkerConsumption` perde o `|| 5` silencioso.

**`/prototypes`**

- As 4 métricas derivam de `pilotosOperacionais(prototypes)`; ausência = `—`
  com aviso `prototipo-so-vitrine` + CTA `cta-prototipo-sem-piloto`.
- `formData.refCode` inicial e reset **vazios**, validados no save.
- Abrir um exemplo para edição **não herda** a referência: campo vazio; salvar
  promove com `demo: false` (ação explícita do usuário).
- `openFitAudit()` bloqueia vitrine antes de materializar ficha.
- Cards de vitrine mostram **"Cadastrar como meu"** em vez de
  `Ficha` / `Prova POM & Lacre` / `Avançar`; sem foto → "Sem foto do piloto".

**`/ai-center` (`ProductStudio`)**

- `selectedTechRef` derivado **somente** das fichas salvas (`useEffect` sobre
  `techSheetRefOptions`), sem default plantado.
- Opção "Nenhuma ficha técnica salva", botão "Carregar Ficha" **desabilitado**
  e aviso `studio-sem-ficha` com link para `/references`.
- Zero literal `DEV000006` no componente.

**`src/routes/__root.tsx`**

- `<Toaster />` montado no `RootComponent`. **Todos** os `toast.*` do app
  passam a aparecer — inclusive as validações novas e as de ondas anteriores.

### 2.3 Testes

`src/lib/onboarding/onda46-vitrine.test.ts` — **19 testes**: filtros, promoção
explícita e não-mutação, molde/piloto criados pelo usuário, guardas de fonte
(ausência de defaults de fábrica e dos números 88,3/1,8/5,35), avisos com CTA,
`<Toaster />` montado, vitrine ainda visível, regressão dos 9 CTAs da Onda 44
e `APLICAR-ONDA-21-24.sql` intacto. **Nenhuma asserção antiga foi relaxada.**

---

## 3. Medição DEPOIS (browser, cliques reais)

| Tarefa                           | Resultado                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Abrir `/cad`                     | `MOLDES ATIVOS —`, `EFICIÊNCIA MÉDIA —`, `APROVADOS —`; aviso + CTA presentes; 2 selos de demonstração; 2 "Sync indisponível" |
| Clicar no CTA e ler o formulário | `['', '', '', '0', '0', '0', '1', '0', '0', '0', 'on']` — nenhum número de fábrica                                            |
| Salvar vazio                     | toast **"Informe o código da referência e o nome do arquivo de molde."**                                                      |
| Salvar só ref + arquivo          | toast **"Informe eficiência, largura e comprimento de risco medidos no seu encaixe."**                                        |
| Preencher medidas reais e salvar | `MOLDES ATIVOS 1`, aviso desaparece, `MINHA-REF-46` na tabela **e no `<select>` do estúdio**                                  |
| Abrir `/prototypes`              | 4 métricas `—`, aviso + CTA, 2 botões "Cadastrar como meu"                                                                    |
| Abrir "Novo piloto"              | campo de referência **vazio**                                                                                                 |
| Promover um exemplo              | `PILOTOS ATIVOS 1`, `REF-PROMOVIDA-46`, aviso desaparece                                                                      |
| `/ai-center` sem ficha           | `<select>` com "Nenhuma ficha técnica salva", botão desabilitado, aviso + link                                                |

Capturas: `/home/user/onda46-cad.png`, `/home/user/onda46-prototypes.png`.
`DEV000006` continua **2× em `/cad` e 1× em `/prototypes`** — agora **dentro
da vitrine rotulada**, não como número apurado.

---

## 4. Gates

| Gate                     | Resultado                                                       |
| ------------------------ | --------------------------------------------------------------- |
| `npx tsc --noEmit`       | **0 erros**                                                     |
| `npx eslint .`           | **0 erros**, 20 warnings (os mesmos de sempre, `react-refresh`) |
| `npx prettier --check .` | limpo                                                           |
| `npx vitest run`         | **661/661** (642 + 19), 274 suítes                              |
| `APLICAR-ONDA-21-24.sql` | SHA-256 `382f0f19…` inalterado                                  |

---

## 5. 25ª medição — repo × ar × banco

| Camada    | Estado                                                           |
| --------- | ---------------------------------------------------------------- |
| **Repo**  | **Onda 46** (`2ef69b5` de código + commit de docs), `main` limpo |
| **Ar**    | **Onda 45**, `index-CPZSdWEg.js` / 223 chunks — **parado**       |
| **Banco** | migrações 21/24 aplicadas: view `200 []`, 4 funções `401 42501`  |

Marcadores da Onda 46 no bundle publicado: `cad-so-vitrine` **0**,
`prototipo-so-vitrine` **0**, `studio-sem-ficha` **0**,
`Cadastrar meu molde` **0**, `Molde de demonstração` **0**,
`cta-cad-sem-molde` **0**. Permanecem `glossario-termos` 1,
`CtaProximoPasso` 7, `"Torre Executiva PLM 2.0"` 0 e **`DEV000006` 27×**
(agora explicitamente vitrine em todos os lugares onde era executável).

**Distância: uma onda (46) para publicar.** O banco, que foi a camada
atrasada por 20 medições, continua alinhado.

---

## 6. Pendências do dono

1. **Publicar a Onda 46 no Lovable.** Publicar app **não** aplica SQL — mas o
   SQL já está aplicado, então desta vez é só publicar.
2. **Fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`.** Os 2 specs de e2e seguem
   `skipped`; sem login real não há prova de ponta a ponta do fluxo autenticado
   (baixa de material, cancelamento de reservas, sync CAD → ficha).
3. Opcional: revisar reservas presas por `stock_reservation_aging.dias_ativa`
   — a view agora existe e responde `200 []`.

Dívidas conhecidas, fora do escopo desta onda: `DEV000006` 27× como vitrine
declarada; `ensure()` ainda cria modelo/`materializadas` se chamado (sem
chamadores em código executável); `photorealism`/placeholder de primeiro frame;
jargão em telas internas (`/audit`, `/route-engineering`); formulário longo de
`/orders` (18 inputs / 62 botões).
