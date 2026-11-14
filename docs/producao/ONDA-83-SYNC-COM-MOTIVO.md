# Onda 83 — Sincronização para a nuvem explica o porquê e nunca sobe vitrine

**Data:** 2026-10-21 · **Medição:** 77ª (repo = Onda 83; ar = **Onda 82 publicada**; banco inalterado)

## 77ª medição

- **Ar:** entry **novo** `index-BO5EmpVR.js` / `index-C26yoeGn.js` — 215 chunks / 3.217.104 bytes, 0 falhas; "mover o CAPA" = 1, "Falha ao solicitar peça-mãe" = 0 → **Onda 82 publicada** (o dono publicou sem relatar; medido, não presumido).
- **Banco:** inalterado (view `200 []`, 4 funções `401 42501`, SHA `382f0f19…`).

## Risco escolhido

Varredura das gravações Supabase **fora dos hooks**. Dois pontos falhavam em silêncio:

1. **`src/lib/pcp/sync.ts` `pushAllLotes`** — upsert dos lotes de produção em `pcp_lots` sem ler `error`. Lote salvo no navegador parecia sincronizado e podia nunca chegar ao banco (mesmo sintoma da coleção que "sumia" na Onda 79).
   **Achado mais grave:** empurrava **todos** os lotes, inclusive `demo: true` — vitrine virando linha na tabela operacional, contra o contrato das Ondas 51/59/72 (o `creative-sync` já usa `*Operacionais()`).
2. **`src/lib/cad/store.ts` `tryUpsertDb`** — `catch {}` total, justificado só para a tabela opcional `cad_markers` ausente; permissão/sessão também sumiam.

## O que foi feito

- `pushAllLotes`: só `lotesOperacionais(...)`; erro vira toast com `descreverErroSupabase(error, "sincronizar os lotes de produção na nuvem")`, **uma vez por minuto** (`avisoUnico`, porque o push é debounced a cada alteração do store).
- `cad/store`: silencioso apenas se `isMissingTable(error)`; qualquer outro motivo é dito (`"sincronizar o molde na nuvem"`, com `avisoUnico`).
- `erro-humano.ts`: `42P01`/`PGRST205`/"schema cache" → "tabela ainda não foi aplicada (migration pendente)"; novo `avisoUnico(mensagem, janelaMs)`.
- Trava: `onda83-sync-com-motivo.test.ts` (4 testes: anti-spam; tabela ausente ≠ permissão; nenhum upsert descartado; só operacionais sobem).

## Prova

Local (Vite + Playwright, sessão simulada): `/production` e `/cad` carregam (56/44 botões), **sem toast espúrio** — o push não dispara sem `getUser()` válido, então não há falso alarme; 0 `pageerror`. O caminho de erro é o mesmo provado em produção nas Ondas 81/82. (Nota: 1ª carga transiente com 0 chars em 9 s; página fresca com 20 s normal — padrão já conhecido das Ondas 77/78.)

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **871/871** (867 + 4).

## Publicação

**Há uma publicação pendente (83)** — código de produto; o entry vai mudar de `index-BO5EmpVR.js`. Nenhuma migration.
