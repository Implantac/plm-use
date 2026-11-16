# Onda 88 — Trava CSRF nas server functions

**Data:** 2026-10-21 · **Medição:** 81ª (repo = Onda 88; ar = Onda 87; banco inalterado)

## Risco escolhido

A cada subida do Vite (Ondas 86/87) o framework avisava: **"TanStack Start server functions are not protected by the CSRF middleware"**. As server functions (`_serverFn/…`) gravam no banco como o usuário autenticado (insumo, movimentação, reserva, wave, transição).

**Medido em produção (ANTES):** `POST` cross-site (`Origin: https://atacante.example`, `Sec-Fetch-Site: cross-site`) ao endpoint real `/_serverFn/b6ddfd0d…` (createLaunchWave) **passa** e chega ao handler (resposta 500 só pelo payload do `curl`, não por bloqueio).

**Impacto real, com precisão:** a autenticação das server fns vem pelo header `Authorization: Bearer` anexado pelo cliente (`auth-attacher.ts`), **não por cookie** — um site de terceiros não consegue anexar o token da vítima, então **não há exploração CSRF hoje**. A trava é **defesa em profundidade** (se um dia a sessão migrar para cookie, a proteção já está lá) e elimina o aviso do framework. Não é correção de bug explorável.

## O que foi feito

`src/start.ts`: `createCsrfMiddleware({ filter: ctx => ctx.handlerType === "serverFn" })` em `requestMiddleware`, antes do `errorMiddleware`. Padrão do framework: só `Sec-Fetch-Site: same-origin` / `Origin` igual / `Referer` same-origin passam; sem nenhum dos três, recusa. A recusa é **403 JSON com motivo** ("Requisição recusada: origem não reconhecida…"), no formato `{ ok: false, reason }` que a UI já entende — não um "Forbidden" cru. Navegação (`router`) não é filtrada. O aviso não foi silenciado por configuração. Trava: `onda88-csrf.test.ts` (3 testes).

## Prova (Vite local)

| Requisição                                   | Resultado                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Browser same-origin (`/launch` → Criar wave) | `_serverFn` **200**, handler executa (toast com motivo da sessão, 0 `pageerror`) |
| `curl` cross-site (Origin de terceiro)       | **403** `{ ok:false, reason:"Requisição recusada: origem não reconhecida…" }`    |
| `curl` sem Origin/Referer/Sec-Fetch-Site     | **403** idem                                                                     |
| `curl` same-origin                           | passa pelo CSRF (500 pelo payload inválido do `curl`, como em produção)          |

Log do Vite desta subida **sem** o aviso de CSRF.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **884/884** (881 + 3).

## Publicação

**Há uma publicação pendente (88)** — código de servidor; o entry do cliente pode não mudar, então a validação será pelo `curl` cross-site contra produção (esperado 403). Nenhuma migration.
