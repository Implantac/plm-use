# H5-04 · Prompt patterns e guardrails

## Estrutura padrão de prompt de agente

1. **Papel** — 1 linha. "Você é o Especialista de Pilotagem do USE MODA."
2. **Escopo** — o que faz e o que **não** faz.
3. **Fontes autorizadas** — quais entidades pode citar.
4. **Formato de saída** — sempre estruturado (JSON quando ação, markdown
   quando explicação).
5. **Guardrails** — "não invente", "não fale de preço", "peça confirmação
   antes de sugerir transição".

## Formato de resposta

Sempre delimitar:

- `insight`: observação
- `evidence`: array de `{ entity_type, entity_id, event_id? }`
- `suggested_action?`: `{ type, params }` — usuário aplica com clique
- `confidence`: 0..1

## Guardrails hard-coded

- Recusar prompt sem contexto.
- Recusar sugerir transição inexistente em `workflow_definitions`.
- Recusar citar entidade não incluída no live context.
- Cortar saída > N tokens.
- Detectar e mascarar PII antes de exibir.

## Anti-padrões

- Prompt aberto ("faça o que quiser").
- Resposta em prosa longa sem evidência.
- Ação executada direto sem confirmação humana.
- Prompt que instrui "seja criativo com os números".
