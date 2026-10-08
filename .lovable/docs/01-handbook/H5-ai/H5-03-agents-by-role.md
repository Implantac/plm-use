# H5-03 · Agentes por perfil (Software House)

Cada agente é um **perfil especialista** com escopo estreito, prompt
próprio e catálogo de ferramentas limitado. Espelha os departamentos da
Software House (FPEF V13).

## Estrutura

Registro em `src/lib/ai/agents.functions.ts`:

```ts
{
  id: 'specialist.modelagem',
  department: 'moda',
  role: 'Especialista Modelagem',
  system: '...prompt curto e específico...',
  tools: ['getTechSheet', 'getReference', 'listBom'],
  guardrails: ['no_erp_write', 'suggest_only'],
}
```

## Perfis mínimos (Onda 3 — expandir gradualmente)

- **Diretoria:** CEO, CTO, Diretor Produto, Diretor Industrial
- **Moda:** Estilo, Engenharia, Modelagem, Pilotagem, Lavanderia,
  Acabamento, Tendências
- **Produção:** PCP, APS, MRP, Corte, Costura, Facção
- **Qualidade:** CAPA, Inspeção, Metrologia
- **Software:** Arquiteto, Backend, Frontend, DevOps, QA
- **UX:** Pesquisa, Interação, Visual
- **IA:** Prompt Engineer, Data, ML Ops
- **BI:** Analista, Modelagem dimensional

## Como escolher perfil

Ferramenta `router` decide via: entidade em foco + intenção do usuário +
role do usuário logado. Nunca todos os agentes ao mesmo tempo.

## Regras

- Cada agente **só** enxerga ferramentas do seu escopo (menor privilégio).
- Nunca dois agentes escrevem no mesmo evento. Roteador consolida.
- Handoff explícito: agente A pode "pedir ajuda" ao agente B via server fn
  registrada — não improviso no prompt.

## Anti-padrões

- Um "agente geral" que sabe tudo.
- Prompt de 2000 tokens listando 40 papéis.
- Agente que escreve no banco direto.
