# Onda 87 — Launch e workflow: server functions com motivo e UI que nunca trava

**Data:** 2026-10-21 · **Medição:** 80ª (repo = Onda 87; ar = Onda 86; banco inalterado)

## Risco escolhido (bug reproduzido em produção)

Mesma classe da Onda 86, nas demais server functions:

- **`/launch`**: 5 chamadas (`createLaunchWave`, `promoteShowroomDecisions`, `transitionLaunch` ×2, `sendLaunchHandoff`) **sem `try/catch`**. **ANTES em produção** (Onda 86 no ar): `/launch` → Nova wave → preencher → Criar com sessão inválida → `pageerror: Unauthorized: Invalid token`, **nenhum toast**. Captura `auditoria/wave87-prod-antes.png`.
- **`launch.functions.ts`** (7) e **`transition.functions.ts`** (2): `reason` com `error.message` cru.
- **`use-transition.ts`**: capturava, mas exibia `Falha na transição (…): Unauthorized: Invalid token`.

## O que foi feito

- `/launch`: as 5 chamadas envoltas em `chamarServidor("<ação>", …)`.
- `launch.functions` / `transition.functions`: `reason` via `descreverErroSupabase(erro, ação)` ("criar a wave", "promover as decisões", "validar a transição", "mover a wave", "registrar/confirmar o handoff", "atualizar o status").
- `use-transition`: o `catch` passa pelo `chamarServidor` → motivo humano.
- Trava: `onda87-launch-workflow-com-motivo.test.ts` (3 testes).

## Prova do DEPOIS (Vite local, mesma sessão)

Toast exibido, 0 `pageerror` (`auditoria/wave87-depois.png`). Como na 86, no sandbox o servidor lança um erro de WebSocket do Node 20 antes do middleware — texto repassado, artefato local; em produção o lançamento é `Unauthorized`, traduzido para "sessão expirou ou é inválida".

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **881/881** (878 + 3).

## Publicação

**Há uma publicação pendente (87)** — código de produto; o entry vai mudar de `index-96F5hQc4.js`. Nenhuma migration.
