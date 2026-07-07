# V14 · Competitive Intelligence

> Antes de projetar qualquer funcionalidade, a IA **precisa** responder
> internamente como os principais PLMs do mundo resolveriam o mesmo problema.
> Não para copiar — para superar.

## PLMs de referência (benchmark obrigatório)

| PLM | Origem | Força reconhecida | Limitação típica |
|---|---|---|---|
| **Centric PLM** | US | Padrão de mercado enterprise, mobile-first para buyers | Custo alto, implantação longa, UI densa |
| **PTC FlexPLM** | US | Robustez industrial, integração ERP profunda | Complexidade, curva de aprendizado brutal |
| **Lectra Kubix Link** | FR | Integração CAD/marker + material library | Foco em grandes marcas, pouco flexível |
| **Gerber Yunique PLM** | US | Colaboração global, calendar management | Legado técnico, UX datada |
| **Collection Moda** | BR | Aderência à confecção nacional, ficha técnica prática | Baixa modernidade tech, sem IA embarcada |
| **Audaces Idea** | BR | Ecosistema Audaces (corte, modelagem), ficha técnica | Pouco PLM completo — foca criação/CAD |

## Protocolo de pesquisa por feature

Antes de qualquer design review (V13), preencher mentalmente:

1. Como o **Centric** resolveria?
2. Como o **FlexPLM** resolveria?
3. Como o **Kubix Link** resolveria?
4. Como o **Yunique** resolveria?
5. Como o **Collection Moda** resolveria?
6. Como o **Audaces Idea** resolveria?
7. Qual é a **melhor prática comum** entre eles?
8. Qual é a **limitação comum** entre eles?
9. Como resolvemos **mais simples, mais intuitivo, mais aderente à confecção BR**?

O resultado da pesquisa vai como bloco `## Competitive Notes` no PR/plan.

## Diretriz

- **Nunca clonar UI.** Absorver o *padrão mental*.
- **Superar em usabilidade.** Menos cliques, drawer contextual (V4), IA embarcada (V11).
- **Superar em aderência.** Terminologia da confecção BR, integração ERP nacional (V9).
- **Superar em transparência.** Toda ação vira evento (V7), tudo auditável.

## Gaps
- Não temos ainda um repositório versionado de "competitive notes" por feature.
- Não temos capturas/mapa mental dos concorrentes armazenado no repo.
- Onda futura: tabela `competitive_notes` + agente IA "Analista Concorrência" no
  V13 (departamento **Diretoria** ou novo departamento **Inteligência de Mercado**).

## Definition of Done
- [x] PLMs de referência catalogados.
- [x] Protocolo de 9 perguntas escrito.
- [ ] README FPEF atualizado com V14.
- [ ] Handbook (H-series) referenciando este volume no fluxo de discovery.
