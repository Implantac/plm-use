# Onda 84 — `cloud-sync` e `creative-sync` explicam o porquê; push por diff não sobe vitrine

**Data:** 2026-10-21 · **Medição:** 78ª (repo = Onda 84; ar = **Onda 83 publicada**; banco inalterado)

## 78ª medição

- **Ar:** entry **novo** `index-BZ0mwsTv.js` / `index-CwB9f4iz.js` — 215 chunks / 3.217.738 bytes, 0 falhas; "sincronizar os lotes" = 1 → **Onda 83 publicada** (medido). Script de medição agora persistido em `/home/user/scripts/medir_ar.py`.

## Risco escolhido

Fechar a família "sync para a nuvem". Os dois motores restantes — `cloud-sync.ts` (influencers, CAPA, fichas técnicas) e `creative-sync.ts` (coleções, cores, paletas, estampas…) — ainda diziam **"Não foi possível salvar X na nuvem. Tente novamente."** sem motivo e sem anti-spam (debounce a cada alteração do store). Além disso, o push por diff de influencers (`prevMap.get(i.id) !== i`) não filtrava `demo: true`: qualquer alteração de referência num creator de vitrine o enviaria para `influencers` (o `hydrate` já re-marcava por handle na volta — Onda 59 — mas a linha teria ido ao banco).

CAPA não tem vitrine (0 `demo` em `quality/store.ts`); fichas já usam push seletivo por `dirty`.

## O que foi feito

- `pushOrWarn` (`cloud-sync`) e `pushModule` (`creative-sync`): `descreverErroSupabase(error, "salvar <rótulo> na nuvem")` + `avisoUnico` (60 s).
- `cloud-sync` influencers: `if (i.demo) continue;` antes do push por diff.
- Trava: `onda84-cloud-sync-com-motivo.test.ts` (2 testes: nenhum motor usa o genérico; diff de influencers pula vitrine). Os 11 testes do `creative-sync` (Onda 72) seguem verdes.

## Prova

Local: `/influencers`, `/collections`, `/quality` carregam (44/49/49 botões), sem toast espúrio, 0 `pageerror`. O caminho de erro é o já provado em produção nas Ondas 81/82.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **873/873** (871 + 2).

## Publicação

**Há uma publicação pendente (84)** — código de produto; o entry vai mudar de `index-BZ0mwsTv.js`. Nenhuma migration.
