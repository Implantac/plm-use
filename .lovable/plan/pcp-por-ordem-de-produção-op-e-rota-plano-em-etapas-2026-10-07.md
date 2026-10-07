# PCP por Ordem de Produção (OP) e Rota — plano em etapas

O quadro atual do PCP (lotes, referências, setor atual) continua igual. Ao lado dele entra uma segunda visão, "Por OP / Rota", que o usuário escolhe num seletor no topo da tela de Produção.

## Etapa 1 — Base de dados e rotas
- Cadastro de **rotas produtivas** (ex.: Rota Silk, Rota Bordado, Rota Sublimação + Bordado), cada uma com etapas em ordem: setor, operação, se é obrigatória e se é terceirizada.
- Cadastro de **configurações produtivas** de um produto base (ex.: "Camiseta básica com silk"), com uma rota padrão e rotas alternativas permitidas.
- Tela "Engenharia de Rotas" para montar e reordenar etapas.

## Etapa 2 — Ordens de Produção e itens
- **OP** com número, prioridade, datas previstas, status e o número da OP no ERP (só referência, sem duplicar dados do ERP).
- **Itens da OP**: referência, cor, configuração, quantidade planejada / produzida / perdida. Cada item pode seguir uma rota diferente.
- Ao criar a OP, cada item recebe a rota da configuração (pode trocar por uma alternativa autorizada, com justificativa).

## Etapa 3 — Saldo por etapa e passagens
- O sistema guarda **quanto de cada item está em cada etapa** (ex.: 300 na costura e 200 no silk = 500).
- Toda movimentação vira um registro: OP, item, de/para, quantidade, tipo (total, parcial, desvio, retorno, ajuste), usuário, data e hora.
- **Passagem em bloco**: selecionar vários itens, escolher "Total disponível" (sem digitar nada) ou "Parcial" (tabela com Disponível e Passar, bloqueando passar mais que o disponível).
- A **próxima etapa** aparece sozinha, calculada pela rota.
- Retorno de etapa e perdas exigem motivo.

## Etapa 4 — Novo quadro e tela da OP
- Quadro por etapa com cartões de OP: número, itens, quantidade em cada etapa, progresso, prazo, alertas de atraso.
- Clicar no cartão abre a **tela da OP**: todos os itens, a rota de cada um desenhada com as etapas concluídas/atuais, histórico de passagens e o botão de passagem em bloco.
- Filtros (status, prioridade, etapa, rota, atraso) e busca por número da OP ou referência.

## Etapa 5 — Integração com o restante
- Torre de Controle e Produção do Dia passam a somar também os dados por OP (gargalo por etapa, peças paradas).
- Eventos na linha do tempo e permissões por papel (PCP, líder, operador, visualizador).
- Dados de exemplo (3 rotas, 2 configurações, 2 OPs) para testar.
- Testes dos cenários do documento (passagem total, parcial, item com rota diferente, retorno).

Cada etapa é entregue e testada antes da próxima.

## Detalhes técnicos
- Novas tabelas: `production_routes`, `production_route_steps`, `product_configurations`, `configuration_routes`, `production_orders`, `production_order_items`, `production_passages`, `production_item_step_balance`; todas com RLS, GRANT e `created_by/updated_by`.
- Passagens gravadas por função no banco (transação única, trava de linha no saldo) que valida quantidade ≤ saldo, calcula a próxima etapa pela sequência e grava um `batch_id` comum aos movimentos do bloco; trigger emite `entity_events` (`production.passage.*`).
- Novos valores no enum `entity_type`: `production_order`, `production_order_item`, `production_route`.
- Store/hooks novos em `src/hooks/use-production-orders.ts`; componentes em `src/components/pcp/op/`; quadro atual (`src/lib/pcp/store.ts`, `KanbanColumn`, `LoteCard`) intocado.
- Seletor de visão na rota `/production` via parâmetro `?view=op`; nova rota `/route-engineering`.
- ERP: `erp_op_id` como vínculo externo via `ErpAdapter`, sem copiar dados transacionais.
