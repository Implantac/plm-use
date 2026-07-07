# H5-02 · Live context e grounding

Toda IA do PLM recebe um **contexto vivo** — snapshot do estado atual do
sistema, filtrado por relevância.

## Fonte
`src/lib/ai/live-context.functions.ts` — server fn que monta o pacote:
- Entidade focal (referência, lote, CAPA) e vizinhas via `entity_relations`
- Últimas 72h de `entity_events` da entidade
- Status atual e transições possíveis (`workflow_definitions`)
- Comentários recentes (últimos 20)
- Snapshot mínimo do ERP quando pertinente (via `ErpAdapter`)

## Regras
- Contexto **sempre server-side** — nunca deixar o cliente montar prompt
  com dados brutos.
- Antes de enviar, redigir: remover email, telefone, valor financeiro se
  não for essencial.
- Tokens de contexto < 8k. Se maior, resumir com heurística ou summarizer
  barato antes.
- Cache por `(entity_id, entity_type, hash(state))` — TTL curto (60s).

## Grounding no prompt
System prompt sempre inclui: "Responda somente com base nos dados abaixo.
Se faltar dado, diga 'não sei' e sugira qual query rodar."

## Anti-padrões
- LLM chamado com prompt genérico sem dado do banco.
- Contexto montado no cliente e passado como parâmetro.
- Reusar contexto de outra entidade por engano (chave de cache mal feita).
