# H5-01 · Princípios de IA industrial

IA no PLM não é chatbot decorativo. Precisa reduzir tempo de decisão em
processo real de moda.

## 5 princípios
1. **Grounded ou nada.** Toda resposta cita entidade real (`reference`,
   `piloto`, `capa`) com id. Sem dado do banco, IA não fala.
2. **Ação sugerida, humano decide.** IA propõe transição, comentário,
   ajuste de BOM. Aplicar requer clique explícito.
3. **Auditável.** Toda saída de IA relevante vira `entity_event` com
   `event_type = 'ai_suggested'` e payload (modelo, tokens, prompt hash).
4. **Especialista, não generalista.** Cada agente tem escopo estreito
   (modelagem, PCP, qualidade). Ver H5-03.
5. **Sem PII, sem financeiro sensível no prompt.** Redigir antes de enviar.

## Modelos
Default: **Lovable AI Gateway** — sem chave própria. Escolher modelo pelo
custo/latência da tarefa, nunca o mais caro por padrão.

## O que IA NÃO faz
- Aprovar workflow.
- Escrever no banco sem intermediário humano.
- Emitir evento diretamente (só via server fn auditada).
- Falar sobre entidade que não leu.
- Especular sobre custo, prazo ou capacidade sem dado.
