# H5-05 · Custo, cache e auditoria

IA é custo variável. Sem controle, quebra a operação.

## Custo

- Escolher modelo pela tarefa: classificação/extração → modelo pequeno;
  raciocínio longo → modelo maior. Nunca "sempre o topo".
- Contexto enxuto (H5-02) reduz tokens de input, que é onde o custo mora.
- Streaming apenas quando UX ganha — não por default.

## Cache

- Cache de **live context** por `(entity, hash(state))` TTL 60s.
- Cache de **resposta** por `(agent, context_hash, prompt_hash)` quando
  determinístico. TTL 5–15min.
- Invalidar cache no evento de mudança da entidade (subscrição em
  `entity_events`).

## Auditoria

Cada chamada gera `entity_event` `ai_suggested` com payload:

```json
{
  "agent": "specialist.pcp",
  "model": "gpt-x-mini",
  "input_tokens": 1240,
  "output_tokens": 380,
  "cost_usd": 0.0018,
  "prompt_hash": "...",
  "context_hash": "...",
  "applied_by_user": null
}
```

Se o usuário aplica a sugestão, novo evento `ai_applied` referencia o anterior.

## Métricas obrigatórias

- Custo por agente/dia
- Taxa de aplicação (sugestões aceitas / total)
- Latência p95
- Taxa de recusa por guardrail (proxy de qualidade do prompt)

## Anti-padrões

- Log em prosa sem estrutura.
- Chamar LLM em loop sem circuit breaker.
- Nenhum limite de tokens por request.
- Prompt e resposta em plain text no console em produção.
