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
- **Contexto ao vivo** de `entity_events` (últimas 72h, contadores + eventos recentes) via `src/lib/ai/live-context.functions.ts` — chamado automaticamente pela página antes de cada mensagem (V11 gap #1 parcialmente fechado)

## Gaps críticos
- **Sem tool calling** — modelo não consulta banco por conta própria, só recebe snapshot pré-computado
- Sem consulta a ERP adapter (V9) via ferramenta do modelo
- Sem memória entre turnos
- Sem "modo diretor" cross-agent (uma pergunta, três perspectivas)
- Filtro de `entity_types` no live-context é fixo por perfil — poderia ser dinâmico

## Próxima onda proposta
1. Adicionar `.middleware([requireSupabaseAuth])` nos agentes
2. Ferramenta `queryEntityEvents({entity_type, since})` disponível ao modelo
3. Ferramenta `queryErp({resource, filter})` via `ErpAdapter`
4. Structured output pra recomendações acionáveis
