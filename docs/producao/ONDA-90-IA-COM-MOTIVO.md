# Onda 90 — Agentes de IA com motivo real (sem fallback silencioso)

## Sintoma medido

- `askAgent` devolvia `error` cru: `e.message` de rede do servidor e
  `Falha (502): <html do gateway…>`.
- `/ai-agents`: quando a server fn falhava (sessão expirada, sem papel, sem
  créditos, gateway fora), a tela **caía no fallback determinístico em
  silêncio** — o usuário via uma resposta "da IA" sem saber que a IA não
  respondeu nem por quê. `catch {}` vazio em `fetchLive`.
- `ProductStudio` e `TechSketchPanel`: `toast.error(result.error)` cru e
  `catch` genérico.

## Correção

- Lógica do agente extraída para `src/lib/ai/responder-agente.ts`
  (`responderAgente(data, context, deps)`), testável — o plugin do Start troca
  o handler por stub RPC em bundles de cliente/teste. Toda recusa passa por
  `falha(reason, detalhe)`: `reason` em linguagem do usuário; o texto cru vai
  só para `console.warn` do servidor. Mantém `error: reason` por compat.
- Motivos: sem papel na confecção · AI Gateway não configurado · limite
  temporário (429) · créditos esgotados (402) · "respondeu com erro (HTTP n)"
  · "falha de rede no servidor".
- `/ai-agents`: `chamarServidor("consultar o agente", …)`; fallback local
  **mantido**, mas com `toast.warning` do motivo e a resposta marcada
  `(Sem IA — motivo)`. `fetchLive` falhando → aviso único (`avisoUnico`) e
  segue com contexto local. Agente Engenharia continua determinístico por
  design (não chama IA).
- `ProductStudio`/`TechSketchPanel`: `chamarServidor` + `reason`;
  erro do desenho passa por `descreverErroSupabase`.
- Trava `onda90-ia-com-motivo.test.ts` (5): sem mensagem crua; telas usam
  `chamarServidor` e não têm catch silencioso; `responderAgente` devolve
  `reason` para sem-papel, sem chave, 402, 502 (sem vazar HTML), rede caída
  (sem vazar `ECONNRESET`) e `ok:true` no caminho feliz.

## Prova local (Vite dev, Playwright, agente PCP)

Pergunta → toast "Não foi possível consultar o agente: …" + chat
"(Sem IA — …)" + resposta local, 0 `pageerror` (`auditoria/ia90-local-depois.png`).
Localmente o motivo é o limite do ambiente (Node 20 sem WebSocket); em
produção será sessão/papel/créditos/gateway.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 892/892 (144 arquivos)**.

## Publicação

Nenhuma migration. Validação pós-deploy: em `/ai-agents` (PCP) com sessão
inválida, toast com motivo de sessão + "(Sem IA — …)", 0 `pageerror`.
