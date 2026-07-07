# H0-03 · Princípios de engenharia do USE MODA PLM

Princípios técnicos que se aplicam a **todo** código do projeto,
independentemente da linguagem, stack ou framework do momento.

## 1. Regra no servidor, UX no cliente
Toda regra de negócio vive no banco (trigger, função `SECURITY DEFINER`,
constraint) ou em server function autenticada. O cliente **nunca** é fonte de
verdade — apenas UX (habilitar botão, mostrar aviso).

## 2. Evento antes de tela
Nenhuma mutação relevante existe se não emitir evento em `entity_events`
(FPEF V7). Se não vale evento, provavelmente não é ação relevante.

## 3. Contextual > navegacional
Abrir uma entidade = drawer (FPEF V4). Nova rota só quando o usuário muda de
contexto de trabalho. Menos cliques, mais foco.

## 4. Digital Thread sempre conectada
Nenhuma entidade nasce órfã. Toda entidade tem `entity_relations` para pelo
menos uma origem e uma consequência (FPEF V3).

## 5. Workflow em tabela, não em código
Estados válidos e transições ficam em `entity_workflows` /
`reference_transitions` (FPEF V8). Nada de `switch` de status em componente.

## 6. RLS + GRANT em toda tabela pública
Sem exceção. Tabela pública sem policy = tabela quebrada.

## 7. Segurança por padrão
- Sem service_role no cliente.
- Sem secret hardcoded.
- Sem SECURITY DEFINER exposto ao role `authenticated` sem revisão.

## 8. Performance embutida
- Sem N+1.
- Sem `select *` desnecessário.
- Sem re-render em cascata (memo, seletores).
- Índice em toda FK e coluna de filtro.

## 9. IA aterrada em evento
Nenhum agente (FPEF V11) responde sobre operação sem consultar
`entity_events` e/ou o `ErpAdapter`. Alucinar sobre dado industrial é falha
crítica.

## 10. Design Review antes de código
As 10 perguntas do FPEF V13 são obrigatórias. Nenhum "não se aplica" sem
justificativa escrita.

## 11. Concorrência é insumo, não inspiração visual
Antes de projetar feature, executar o protocolo do FPEF V14 (Centric,
FlexPLM, Kubix Link, Yunique, Collection Moda, Audaces Idea). Absorver
padrão mental, superar em usabilidade e aderência BR.

## 12. Documentar ou não existe
Toda feature nova entrega: código + migration + evento + teste + entrada no
Handbook + atualização do KPI (FPEF V10). Faltou um item = feature incompleta
(FPEF V12).
