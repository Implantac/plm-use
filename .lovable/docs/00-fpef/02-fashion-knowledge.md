# V2 · Conhecimento da Moda

Cadeia mental que a IA e o produto devem dominar:

```
Pesquisa → Moodboard → Cartela → Tendências → Briefing → Croquis → Referência
        → Modelagem → Piloto → Correções → Aprovação → Engenharia
        → Compras → Produção → Mostruário → Venda → Pós-venda
```

## Onde já está mapeado
- `.lovable/docs/06.1-compras.md`
- `.lovable/docs/06.2-estoque.md`
- `.lovable/docs/06.3-producao.md`
- `.lovable/docs/06.4-qualidade.md`
- `.lovable/docs/06.5-comercial.md`
- `.lovable/docs/06.6-custo-margem.md`

## Gaps
- **02.1 Pesquisa & Moodboard** — não existe doc dedicado
- **02.2 Modelagem & Pilotagem** — não existe doc dedicado
- **02.3 Engenharia de Produto** — precisa detalhar BOM/BOP/consumo
- Glossário canônico de termos (piloto, mostruário, facção, passagem, ocorrência)

## Uso pela IA
Todo prompt de agente (`src/lib/ai/agents.functions.ts`) deve carregar como contexto
o subset relevante desta cadeia. Hoje o system prompt é genérico — evoluir para
prompts com knowledge injection por etapa.
