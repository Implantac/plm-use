# Onda 89 — `inputValidator()` → `validator()` nas server functions

## Risco medido

O TanStack Start `1.168.x` marca `inputValidator` como `@deprecated` (alias de
`validator`). O Vite dev emitia 4 avisos só em `launch.functions.ts`; havia
**11 usos** em 5 arquivos (`launch`, `inventory`, `workflow/transition`,
`ai/agents`, `ai/live-context`). Num upgrade que remova o alias, **todas** as
server functions com entrada deixariam de compilar/validar ao mesmo tempo.

## Correção

- Troca mecânica `.inputValidator(` → `.validator(` nos 11 pontos; nenhuma
  mudança de schema, middleware ou handler.
- Trava `src/lib/onboarding/onda89-validator-nao-deprecado.test.ts` (3):
  1. nenhum arquivo de `src` usa `.inputValidator(`;
  2. toda server function cujo handler lê `data` passa por `.validator(`
     (as 4 sem validator — listagens/ABC — não leem `data`);
  3. prova executável: o validator ligado em `createLaunchWave` recusa
     `codigo: "W"` (min 2) e `{}`, e aceita payload válido.

## Prova local (Vite dev, Playwright com sessão simulada)

- `/launch` → Criar wave: a chamada chega ao `_serverFn` (200 de transporte),
  toast com motivo, 0 `pageerror`; log do Vite **sem** avisos de deprecação.
- Limite do ambiente: o middleware de auth falha antes do validator (Node 20
  sem WebSocket), por isso a recusa de entrada inválida é provada no vitest.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 887/887 (143 arquivos)**.

## Publicação

Nenhuma migration. Só publicar; validação pós-deploy: clique real "Criar wave"
em produção segue com toast de motivo e 0 `pageerror` (entry do cliente muda).
