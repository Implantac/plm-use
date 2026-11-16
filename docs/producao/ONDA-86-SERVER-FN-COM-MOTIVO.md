# Onda 86 — Server functions do almoxarifado: motivo legível e UI que nunca trava

**Data:** 2026-10-21 · **Medição:** 79ª (repo = Onda 86; ar = Onda 85; banco inalterado)

## Risco escolhido (bug reproduzido em produção)

As cinco gravações do almoxarifado passam por `createServerFn` (`upsertStockItem`, `registerMovement`, `createReservation`, `updateReservationStatus`, `runAbcClassification`). Dois defeitos:

1. **Servidor devolvia `reason: error.message` cru** e até o literal **`"forbidden"`**, que a UI exibia direto (`toast.error(res.reason)`).
2. **Quando a server fn lançava** (middleware `requireSupabaseAuth` → `Unauthorized: Invalid token`; rede; 500), o `await` sem `try/catch` virava rejeição não tratada e deixava `busy = true`.

**Prova do ANTES em produção** (`/inventory` → Adicionar → preencher → Cadastrar, sessão inválida): `pageerror: Unauthorized: Invalid token`, **nenhum toast**, botão "Cadastrar" **travado** (`disabled: true`), diálogo aberto. Captura `auditoria/insumo86-prod-antes.png`.

## O que foi feito

- `inventory.functions.ts`: todos os `reason` passam por `descreverErroSupabase(erro, "<ação>")`; `forbidden` virou "requer papel de admin, gestor ou almoxarifado. Solicite a um admin." (12 pontos, incluindo `listWarehouses`).
- `erro-humano.ts`: novo `chamarServidor(ação, fn)` — captura o lançamento da server fn e devolve `{ ok: false, reason }` legível (`Unauthorized`/JWT → "sua sessão expirou ou é inválida"; rede → "sem conexão"; outro → repassa). O chamador sempre chega ao `setBusy(false)`.
- Os 5 chamadores (`inventory.tsx` ×2, `MovementDialog`, `ReservationDialog`, `ReservationsPanel`) envoltos em `chamarServidor`.
- Trava: `onda86-server-fn-com-motivo.test.ts` (3 testes).

## Prova do DEPOIS (Vite local, mesma sessão)

Toast exibido, botão **liberado** (`disabled: false`), 0 `pageerror`. Captura `auditoria/insumo86-depois.png`. (No sandbox o servidor lança um erro de WebSocket do Node 20 antes do middleware — texto repassado, artefato local; em produção o lançamento é `Unauthorized`, traduzido para "sessão expirou ou é inválida".)

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **878/878** (875 + 3).

## Publicação

**Há uma publicação pendente (86)** — código de produto; o entry vai mudar de `index-BIKP6IRR.js`. Nenhuma migration.
