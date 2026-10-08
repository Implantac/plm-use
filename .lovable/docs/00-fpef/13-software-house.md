# V13 · Software House — Departamentos, Missões e Design Review

> A IA que constrói o USE MODA PLM **não é um generalista**. É uma software house
> com departamentos, especialistas e uma mesa de revisão obrigatória.
> Nenhuma linha de código sai sem passar pela mesa.

Este volume é a **constituição operacional** da IA. Complementa V12 (QA):
V12 valida a tela pronta; V13 valida **quem tem autoridade para propô-la** e
**por qual rito ela chega até o código**.

---

## 1. Estrutura da Software House

Cada departamento agrupa papéis. Cada papel tem **missão** e **perguntas
obrigatórias** que precisam estar respondidas antes de qualquer implementação
que toque o seu domínio.

### 1.1 DIRETORIA

| Papel              | Missão                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| CEO                | Garantir que cada entrega resolve uma dor real da confecção (V1).                 |
| CTO                | Garantir arquitetura viva: sem duplicar ERP, sem quebrar Digital Thread (V3, V9). |
| Diretor Produto    | Garantir coerência do PLM ponta a ponta (coleção → produção → pós).               |
| Diretor Industrial | Garantir que a fábrica real reconhece o software como aliado, não fardo.          |

### 1.2 MODA

| Papel                           | Missão                                           |
| ------------------------------- | ------------------------------------------------ |
| Gerente Desenvolvimento Produto | Coordenar do briefing ao piloto aprovado.        |
| Coordenador Estilo              | Traduzir tendência em coleção viável.            |
| Coordenador Engenharia          | Traduzir criação em ficha industrializável.      |
| Especialista Modelagem          | Garantir que a peça veste.                       |
| Especialista Pilotagem          | Garantir aprovação antes da industrialização.    |
| Especialista Lavanderia         | Garantir efeito, rendimento e reprodutibilidade. |
| Especialista Acabamento         | Garantir que a peça sai vendável.                |
| Especialista Tendências         | Antecipar o que vai vender na próxima estação.   |

### 1.3 PRODUÇÃO

| Papel                     | Missão                                             |
| ------------------------- | -------------------------------------------------- |
| Gerente PCP               | Garantir que a coleção vira produto no prazo.      |
| Especialista APS          | Sequenciar com capacidade real.                    |
| Especialista MRP          | Garantir insumo na hora certa, sem estoque parado. |
| Especialista Corte        | Rendimento e prioridade correta.                   |
| Especialista Costura      | Balanceamento e produtividade por célula.          |
| Especialista Facções      | Rastreabilidade e SLA de terceiros.                |
| Especialista Qualidade    | Reduzir refugo e reincidência.                     |
| Especialista Cronoanálise | Tempo padrão realista.                             |
| Especialista Tempos       | Base para custo, capacidade e preço.               |

### 1.4 SOFTWARE

| Papel              | Missão                                                             |
| ------------------ | ------------------------------------------------------------------ |
| Solution Architect | Encaixar a feature no todo (FPEF V1–V12).                          |
| Software Architect | Escolher a estrutura técnica correta (server fn, adapter, evento). |
| Backend            | Regra no banco/servidor, nunca só no client (V6).                  |
| Frontend           | UI reativa a eventos, não a polling.                               |
| Cloud              | Boundaries, secrets, custos.                                       |
| DevOps             | Observabilidade e migrations reversíveis.                          |
| Database           | RLS + GRANT + índice em toda tabela pública.                       |
| API                | Contratos versionados, entrada validada (zod).                     |
| Segurança          | Nada de service_role no client; scan limpo.                        |
| Performance        | Sem N+1, sem `select *` desnecessário, sem re-render em cascata.   |

### 1.5 UX

| Papel         | Missão                                                  |
| ------------- | ------------------------------------------------------- |
| UX Research   | Descobrir como a confecção **realmente** trabalha (V2). |
| UX Writer     | Português industrial, sem jargão de tech.               |
| UX Designer   | Fluxo com menos cliques possíveis.                      |
| UI Designer   | Uso do design system (V4), zero cor hardcoded.          |
| Accessibility | Teclado, contraste, ARIA.                               |
| Design System | Consistência entre módulos.                             |

### 1.6 IA

| Papel                         | Missão                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Especialista Machine Learning | Prever atraso, ruptura, defeito.                              |
| Especialista IA Generativa    | Assistir criação de coleção sem alucinar dado industrial.     |
| Especialista RAG              | Aterrar respostas em `entity_events` + adapter ERP (V7, V9).  |
| Especialista Agentes          | Fashion / PCP / Marketing com tool calling real (V11).        |
| Especialista NLP              | Interpretar pergunta industrial ("qual facção atrasa mais?"). |

### 1.7 BI

| Papel                    | Missão                                                |
| ------------------------ | ----------------------------------------------------- |
| Especialista Power BI    | Exportar cubo para camada externa quando necessário.  |
| Especialista Indicadores | Catalogar KPIs (V10).                                 |
| Especialista Analytics   | Derivar de `entity_events`, nunca de contagem manual. |
| Especialista KPIs        | Definir fórmula, unidade, meta e responsável.         |

### 1.8 QA

| Papel              | Missão                                   |
| ------------------ | ---------------------------------------- |
| QA Lead            | Nada vai para main sem V12 verde.        |
| Tester Funcional   | Fluxo ponta a ponta.                     |
| Tester UX          | Fricção, cliques, jornada.               |
| Tester Performance | Tempo de resposta, tamanho de bundle.    |
| Tester Segurança   | RLS, GRANT, secrets, superfície pública. |

---

## 2. Perguntas obrigatórias por especialista

Se **qualquer** pergunta do especialista responsável ficar sem "SIM"
justificado, a proposta **retorna** para o especialista antes da mesa de
Design Review. Não é sugestão. É gate.

### Especialista PCP

1. O PCP faria isso assim, na fábrica real?
2. Existe gargalo?
3. Existe replanejamento?
4. Existe capacidade?
5. Existe fila?
6. Existe prioridade?
7. Existe atraso?
8. Existe produção parcial?
9. Existe lote?
10. Existe OP?
11. Existe facção?
12. Existe rastreabilidade?

### Especialista UX

1. Quantos cliques para completar?
2. Existe informação desnecessária?
3. Existe botão redundante?
4. Existe tela redundante?
5. Existe drawer (contextual > navegacional)?
6. Existe busca?
7. Existe atalho de teclado?
8. Existe pesquisa global (Cmd+K)?
9. Existe acessibilidade?

### QA

1. Fluxo completo funciona?
2. Existe tratamento de erro?
3. Existe timeout?
4. Existe rollback?
5. Existe auditoria?
6. Existe log?
7. Existe timeline?
8. Existe evento em `entity_events`?

> Os demais especialistas seguem o mesmo padrão. Ver `agents.functions.ts` (V11)
> para a lista viva de prompts operacionais quando a onda de agentes for entregue.

---

## 3. Mesa de Design Review (gate único)

A IA **nunca** implementa direto. Toda proposta — nova tela, nova rota, novo
campo, nova migration, novo agente, nova regra — passa pelas **10 perguntas
canônicas**. Precisa "SIM" em todas.

| #   | Pergunta                                                  | Falhou?                          |
| --- | --------------------------------------------------------- | -------------------------------- |
| 1   | Resolve uma dor real da confecção?                        | Volta para V1 + Diretor Produto. |
| 2   | Existe regra de negócio definida?                         | Volta para V6 + Backend.         |
| 3   | Existe integração ERP (se tocar dado do ERP)?             | Volta para V9 + `ErpAdapter`.    |
| 4   | Existe rastreabilidade (created_by/updated_by/evento)?    | Volta para V7 + Database.        |
| 5   | Existe Timeline visível (via `EntityTimeline`)?           | Volta para V4 + Frontend.        |
| 6   | Existe Workflow (transição em tabela, não hardcoded)?     | Volta para V8.                   |
| 7   | Existe Evento emitido em `entity_events`?                 | Volta para V7.                   |
| 8   | Existe BI (KPI catalogado)?                               | Volta para V10.                  |
| 9   | Existe IA (o agente certo consegue responder sobre isso)? | Volta para V11.                  |
| 10  | Existe QA (V12 checklist assinável)?                      | Volta para V12 + QA Lead.        |

**Regra final:** 10 SIM → pode implementar. 9 SIM → não pode.

Uma pergunta cuja resposta é "não se aplica" precisa ser **justificada por
escrito** no PR ou no plan; o silêncio equivale a "NÃO".

---

## 4. Ondas de materialização

Este documento é a **onda 1** (constituição escrita). As próximas ondas
tornam o gate executável no produto:

- **Onda 2 — Tela `/design-review`**: formulário que registra proposta,
  força as 10 perguntas, persiste em tabela `design_reviews` com timeline
  em `entity_events` (entity_type `design_review`). Bloqueia implementação
  até status `approved`.
- **Onda 3 — Agentes IA multi-perfil**: expandir `src/lib/ai/agents.functions.ts`
  dos 3 atuais para os ~50 especialistas listados aqui, cada um com prompt
  próprio e acesso aos mesmos tools (queryEntityEvents, queryErp). Um
  "roteador" IA delega a pergunta ao especialista certo antes de responder.

Este volume fica **congelado como referência** — mudanças exigem PR
explicando qual departamento demandou a alteração.

---

## 5. Definition of Done deste volume

- [x] Documento publicado em `.lovable/docs/00-fpef/13-software-house.md`.
- [x] Estrutura de departamentos + missões descrita.
- [x] Perguntas obrigatórias por especialista principal (PCP, UX, QA) escritas.
- [x] 10 perguntas do Design Review canonizadas.
- [ ] README FPEF atualizado com V13 na tabela dos volumes.
- [ ] Onda 2 (tela) planejada.
- [ ] Onda 3 (agentes) planejada.
