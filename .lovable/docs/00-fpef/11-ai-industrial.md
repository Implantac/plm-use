# V11 · IA Industrial

Não é chatbot. É **Diretor Industrial** — responde com dados reais do PLM + ERP.

## Perguntas que a IA deve responder
- Qual coleção está em risco?
- Qual facção vai atrasar?
- Qual piloto está parado há mais tempo?
- Qual lote tem maior risco de defeito?
- Quanto falta comprar para completar a coleção?
- Quais materiais vão entrar em ruptura?

## O que já existe
- 3 agentes: Fashion, PCP, Marketing — `src/lib/ai/agents.functions.ts`
- Rota: `src/routes/_authenticated.ai-agents.tsx`, `_authenticated.ai-center.tsx`
- Modelo padrão: `google/gemini-3-flash-preview` via Lovable AI Gateway
- Chave: `LOVABLE_API_KEY` (server-only)

## Gaps críticos
- **Agente responde sem contexto real** — hoje só recebe `message` + `context` string manual.
  Deveria automaticamente puxar: eventos recentes (`entity_events`), estado de lotes/refs, alertas ativos.
- Sem tool calling — não consulta banco, não consulta ERP adapter
- Sem memória entre turnos
- Sem "modo diretor" cross-agent (uma pergunta, três perspectivas)

## Próxima onda proposta
1. Adicionar `.middleware([requireSupabaseAuth])` nos agentes
2. Ferramenta `queryEntityEvents({entity_type, since})` disponível ao modelo
3. Ferramenta `queryErp({resource, filter})` via `ErpAdapter`
4. Structured output pra recomendações acionáveis
