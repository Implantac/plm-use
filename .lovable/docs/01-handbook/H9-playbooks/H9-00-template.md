# H9-00 · Template de Playbook (por elo da cadeia)

> Copie este arquivo para `H9-<NN>-<slug>.md` (ex.: `H9-01-pesquisa-moodboard.md`)
> e preencha todas as seções. Sem seção vazia — se não se aplica, escreva
> "N/A — <justificativa>". Todo playbook representa **um elo** da cadeia
> produtiva da moda (FPEF V2) e deve ser executável ponta a ponta.

---

## 0. Identificação

- **Elo da cadeia (V2):** <ex.: Pesquisa & Moodboard>
- **Código do playbook:** H9-<NN>
- **Volume(s) FPEF relacionados:** V?, V?
- **Personas envolvidas (V1):** <estilista, coordenador, PCP, ...>
- **Estado:** 🔴 rascunho | 🟡 parcial | 🟢 pronto
- **Autor / Revisor:**
- **Última revisão:** AAAA-MM-DD

## 1. Objetivo do elo

Uma frase: **por que** esse elo existe na cadeia e **qual dor** ele resolve.

- Resultado esperado ao fim do elo:
- Métrica de sucesso (KPI, V10):

## 2. Escopo

- **Faz parte:** <o que este playbook cobre>
- **Não faz parte:** <o que é responsabilidade do elo anterior/posterior>
- **Elo anterior:** H9-<NN> · <nome>
- **Elo posterior:** H9-<NN> · <nome>

## 3. Entradas (inputs)

| # | Entrada | Origem (elo/sistema) | Formato | Obrigatória? |
|---|---------|----------------------|---------|--------------|
| 1 |         |                      |         |              |

Regras:
- Toda entrada precisa ser rastreável a uma entidade do catálogo (H2-02).
- Entrada vinda de ERP passa por `ErpAdapter` (V9 / H6-02) — nunca query direta.

## 4. Saídas (outputs)

| # | Saída | Destino (elo/sistema) | Entidade / Evento | Obrigatória? |
|---|-------|-----------------------|-------------------|--------------|
| 1 |       |                       |                   |              |

Regras:
- Toda saída relevante emite `entity_events` (V7 / H2-04).
- Mudanças de estado passam por `workflow_definitions` (V8 / H2-05).

## 5. Regras de negócio (V6)

- **R1:** <sempre X>
- **R2:** <nunca Y>
- **R3:** <exceção Z + tratamento>

Onde cada regra é aplicada:

| Regra | Camada (DB / server fn / client) | Referência de código |
|-------|----------------------------------|----------------------|
| R1    |                                  |                      |

## 6. Workflow (V8)

```text
<estado inicial> → <estado> → <estado final>
```

- Máquina de estados registrada em `workflow_definitions`? SIM/NÃO
- Transições proibidas listadas? SIM/NÃO
- Quem pode transicionar cada aresta (papel / `has_role`):

## 7. Eventos emitidos (V7)

| `event_type` | Quando | Payload mínimo | Consumido por |
|--------------|--------|----------------|---------------|
|              |        |                |               |

## 8. Integrações (H6)

- **ERP (H6-02):** <endpoints do contrato consumidos>
- **CAD/PDM (H6-03):** <arquivos, formatos>
- **E-commerce (H6-04):** <sincronizações>
- **Webhooks/Cron (H6-05):** <gatilhos, frequência, idempotência>

## 9. UX (V4 / H4)

- **Rota(s):** `/...`
- **Componentes contextuais:** `EntityDrawer`, `EntityTimeline`, `EntityRelations`, ...
- **Fluxo em cliques (H4-04):** <máx. cliques para completar o caso feliz>
- **Estados:** vazio, carregando, erro, sucesso — todos cobertos? SIM/NÃO

## 10. IA (V11 / H5)

- **Agente(s) responsáveis (V13):**
- **Perguntas que o agente deve responder sobre este elo:**
- **Contexto vivo (H5-02):** quais tabelas/eventos alimentam o RAG
- **Guardrails:** o que o agente **não** pode fazer sem humano

## 11. BI (V10)

| KPI | Fórmula | Unidade | Meta | Responsável |
|-----|---------|---------|------|-------------|
|     |         |         |      |             |

Fonte: derivado de `entity_events` sempre que possível — nunca contagem manual.

## 12. Segurança e permissões (H3-03 / H8-04)

- **RLS:** tabelas envolvidas têm policy por ação (SELECT/INSERT/UPDATE/DELETE)? SIM/NÃO
- **GRANT:** todo `public.<tabela>` tem GRANT explícito? SIM/NÃO
- **Papéis autorizados (`has_role`):**
- **PII / dado sensível tratado:**

## 13. Checklist de prontidão do playbook

Nenhum playbook vai para 🟢 sem TODOS marcados.

- [ ] Objetivo e KPI de sucesso definidos (§1)
- [ ] Entradas e saídas rastreáveis a entidades (§3, §4)
- [ ] Regras de negócio codificadas em DB/server (§5)
- [ ] Workflow em `workflow_definitions` (§6)
- [ ] Eventos declarados e emitidos (§7)
- [ ] Integrações via adapter/contrato (§8)
- [ ] UX com drawer + timeline + estados cobertos (§9)
- [ ] Agente IA com escopo e guardrails (§10)
- [ ] KPI catalogado e derivado de eventos (§11)
- [ ] RLS + GRANT verificados (§12)
- [ ] Design Review (V13 · 10 perguntas) aprovado
- [ ] QA (V12 · 12 perguntas) verde
- [ ] Release checklist (H7-05) executado

## 14. Artefatos de referência do Handbook

Todo playbook cita explicitamente **quais** artefatos do Handbook aplica.

- **FPEF:** V1, V2, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14
- **H1 Discovery:** H1-01, H1-04, H1-05
- **H2 Domain:** H2-02 (catálogo), H2-03 (tabela pública), H2-04 (evento), H2-05 (workflow), H2-06 (relação)
- **H3 Architecture:** H3-01 (camadas), H3-02 (server fn), H3-03 (RLS), H3-04 (ERP adapter), H3-05 (observabilidade)
- **H4 Frontend:** H4-01 (rotas), H4-02 (data fetching), H4-04 (contextual), H4-05 (a11y/perf)
- **H5 IA:** H5-02 (contexto vivo), H5-03 (agentes por papel), H5-05 (custo/audit)
- **H6 Integrações:** H6-02 (ERP), H6-05 (webhooks/cron)
- **H7 Qualidade:** H7-01 (estratégia), H7-02 (RLS/workflow), H7-03 (E2E), H7-05 (release)
- **H8 Ops:** H8-02 (secrets), H8-04 (app security), H8-05 (compliance)

Cite acima **apenas** os que o playbook realmente usa; remova os demais.

## 15. Competitive Notes (V14)

| PLM | Como resolve este elo | Limitação | Como superamos |
|-----|-----------------------|-----------|----------------|
| Centric         | | | |
| PTC FlexPLM     | | | |
| Lectra Kubix    | | | |
| Gerber Yunique  | | | |
| Collection Moda | | | |
| Audaces Idea    | | | |

Padrão mental comum extraído:
Nossa aposta de superação (menos cliques / drawer / IA / aderência BR):

## 16. Riscos e mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
|       |         |               |           |

## 17. Changelog do playbook

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
|      | 0.1    |       | criação |
