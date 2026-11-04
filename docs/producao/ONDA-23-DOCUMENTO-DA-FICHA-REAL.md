# Onda 23 — O documento sai da ficha real (e a correção chega a quem já usava)

**Data:** 04/11/2026 · **Antecessor:** `a827293` (Onda 22)

---

## 1. Dois buracos que a Onda 22 deixou abertos

A Onda 22 impediu que ficha de demonstração virasse decisão **para conta nova**.
Ficaram dois furos:

### 1.1 Quem já usava o sistema continuava mentindo

O mapa `materializadas` nasce vazio. Todo navegador que já tinha o store
persistido guardava fichas materializadas por `ensure()` **sem** o mapa — e elas
seguiam contando como "fichas salvas". Ou seja: a correção valia só para quem
nunca tinha aberto o sistema.

### 1.2 As telas de saída nasciam no demo

Cinco telas que **emitem documento ou gravam no documento** ainda começavam em
`DEV000006` e ofereciam as quatro referências de exemplo no seletor:

| Tela                   | O que produz                                                       | O que dava para fazer antes                                                |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `/prints` (2 diálogos) | análise de compatibilidade química, vinculação da estampa na ficha | analisar estampa contra ficha inexistente; gravar aplicação em `DEV000006` |
| `/colors`              | envia cartela Pantone para as variantes da ficha                   | sobrescrever variantes de um produto que não existe                        |
| `/cad`                 | cria molde e **sincroniza consumo de tecido** na ficha             | salvar molde sem trocar o campo → consumo de exemplo virava "real"         |
| `/measurements`        | joga a tabela de medidas na ficha                                  | idem                                                                       |
| `/quality`             | abre **CAPA de quarentena** com laudo AQL                          | abrir CAPA formal para `DEV000006` no lote `OP-2026-084` (lote fictício)   |

Emitir PDF/CAPA com nome de produto de vitrine é pior que não emitir: alguém
imprime e leva para a facção.

## 2. Correção

**Migração do storage persistido** (`version: 2` no `persist`). `seedFor()` é
determinístico — sem uuid, sem `Date.now()` — então a comparação estrutural é
confiável:

> documento persistido **idêntico** ao modelo ⇒ ninguém editou ⇒ `materializadas`.
> Qualquer diferença (um centavo num item de BOM já basta) ⇒ trabalho do usuário.

`migrateTechSheetStorage()` é exportada e testada; roda uma vez na hidratação,
não descarta nada e é idempotente. Preserva mapa já existente.

**`useOperationalRefs()` / `useSelectedRef()`** (`src/lib/techsheet/use-operational-refs.ts`):
a lista de fichas de uma tela de saída passa a ser só ficha editada, ordenada; a
seleção começa vazia, assume a primeira ficha salva e nunca guarda código que saiu
da lista.

**`<SemFichaSalva acao="..." />`**: estado vazio que explica o que fazer, em vez de
oferecer exemplo. Aplicado em `/prints` (2), `/colors`.

**`/cad`**: `refCode` do formulário começa vazio (era `DEV000006`).
**`/measurements`**: seletor só com fichas salvas; botão desabilitado sem seleção.
**`/quality`**: referência, lote e facção começam vazios e o laudo AQL **recusa**
gerar sem referência e lote preenchidos.

## 3. Testes

| Arquivo                         | Casos                 | O que trava                                                                                                                                                                |
| ------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `materializacao.test.ts`        | +7 (16 no total)      | migração v0/v1 → v2: cópia intacta vira template, ficha editada sobrevive como salva, idempotência, storage vazio                                                          |
| `use-operational-refs.test.tsx` | 5 (renderHook, jsdom) | sem ficha salva não seleciona nada; visita que materializa o modelo **não** cria ficha para emitir; assume a primeira salva; descarta ref que saiu da lista; ordem estável |

## 4. Gates

| Gate            | Resultado                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tsc --noEmit`  | ✅ 0 erros                                                                                                                                                                                 |
| eslint          | ✅ 0 erros, 20 warnings preexistentes                                                                                                                                                      |
| prettier        | ✅ limpo                                                                                                                                                                                   |
| vitest          | ✅ **373/373** (eram 361) — uma rodada deu 1 falha em `OrderDetail.test.tsx`, arquivo não tocado; 3 execuções isoladas verdes e a rodada seguinte 373/373 (flake conhecido, não regressão) |
| `npm run build` | ⚠️ **não rodou aqui** — o sandbox mata o processo por memória (exit 137); a CI roda `npm run build` no job `quality`, então o build é verificado lá                                        |

## 5. Provado × não provado

| Item                                              | Estado                                  |
| ------------------------------------------------- | --------------------------------------- |
| Migração classifica cópia do modelo como template | ✅ teste com documento real             |
| Seleção não começa no demo                        | ✅ `renderHook`                         |
| Telas renderizam com o novo estado vazio          | ❌ não visto no navegador (exige login) |
| Build compila com as telas alteradas              | ⚠️ verificado pela CI, não localmente   |
| Ar publicado tem esta onda                        | ❌ o ar continua na Onda 19             |

## 6. Resíduo conhecido

- **`/quality`** ainda calcula o plano AQL com lot size 600 fixo até o usuário
  digitar; o valor não vem mais de `DEV000006`, mas também não vem de uma OP real
  — ligar isso ao lote escolhido é trabalho de outra onda.
- **`/cad`** continua materializando a ficha do código digitado ao salvar
  (`ensureSheet`), o que agora é correto: foi o usuário quem digitou a referência.
- **`/tech-sheet`** abre em `DEV000006` quando não recebe `?ref=` — é a bancada de
  edição, onde ver o modelo é desejado; o selo de template agora aparece lá.
