# Onda 91 — "Unauthorized: Invalid token" nunca mais cru; um toast por falha

## Sintoma medido em produção (84ª medição, validando a Onda 90)

Em `/ai-agents` (PCP) com sessão inválida saíram **dois** toasts: o da IA,
traduzido ("sua sessão expirou ou é inválida…"), e o do contexto de eventos
com texto cru: **"Não foi possível ler os eventos recentes: Unauthorized:
Invalid token"**. Causa: só `chamarServidor` traduzia o erro do
`requireSupabaseAuth`; `descreverErroSupabase` (usado em todo o resto) não.

## Correção

- `descreverErroSupabase` passa a reconhecer `unauthorized` / `invalid token`
  / `no token` / `jwt` → "sua sessão expirou ou é inválida. Entre novamente e
  repita a ação." `chamarServidor` delega a ela (um só lugar de verdade).
- `/ai-agents`: a falha do contexto vira `motivoLive`; se a IA também falhar,
  sai **um** toast (a causa é a mesma); se a IA responder, avisa uma vez
  (`avisoUnico`) que usou só o contexto local.
- `techsheet/publish-catalog.ts`: 3 `error.message` crus → `descreverErroSupabase`
  com a ação ("publicar o produto no catálogo", "sincronizar o grupo X",
  "sincronizar a opção do grupo X"). `isMissingTable` preservado.
- `ai/live-context.functions.ts`: não injeta mais `error.message` do banco no
  prompt enviado à IA.
- Trava `onda91-sessao-invalida-traduzida.test.ts` (7).

## Prova local (Vite dev, Playwright, agente PCP)

**Um** toast com motivo + chat "(Sem IA — …)" + 0 `pageerror`
(`auditoria/ia91-local-depois.png`). Produção antes: `ia90-prod-depois.png`
(dois toasts, um cru).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 899/899 (145 arquivos)**.

## Publicação

Nenhuma migration. Validação: `/ai-agents` (PCP) com sessão inválida → **um**
toast, sem "Unauthorized".
