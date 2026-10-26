# Fluxo operacional do Pedido — revisão executada (26/out/2026)

Revisão feita **rodando o fluxo de verdade**: Postgres 17 no sandbox com as 82
migrations canônicas (`supabase/migrations` + `drizzle/migrations`) reaplicadas,
RLS ativa, papéis simulados por `auth.uid()` (claim `sub`) e as RPCs reais —
nada de leitura de código isolada. O pedido de teste `PED-2026-0001` percorreu
o ciclo completo até a OP.

## O fluxo (estados reais, verificados)

```
VENDEDOR (can_sell: admin, manager, comercial, diretor_produto)
  1. rascunho          createOrder → number via next_sales_order_number (PED-ANO-NNNN)
     addItem: produto do catálogo (só validado), descrição, cor, qtde, preço,
     grade P–3G, opções (Bordado escudo etc.) com "detalhe" = driver_qty/peça
     ← estes são os DADOS INICIAIS da ficha
  2. [Enviar para custo] submit_sales_order (RPC única, transacional):
     guardas: ≥1 item · produto validado · qtde ≥ min · Σgrade = qtde · preço > 0
     · grupos de opção obrigatórios preenchidos
     → EXPLOSÃO DO CATÁLOGO: vira linhas de operação (peca/minuto/mil_pontos…)
     e materiais (quando o catálogo define consumo); tech_status → em_detalhamento
GERENTE DE CUSTOS (can_cost: admin, manager, engenharia_custo, coordenador_produto)
  3. em_custo          dados complementares na ficha (cada edição dispara recalc):
     · bordados: qtdade de pontos por peça, cores extras, chapas (setup amortizado)
     · costura: minutos padrão por operação (reta/overloque/gola)
     · acabamento: operações por peça + etiqueta/hangtag/dobra-PP
     · materiais: consumo POR PEÇA com perda % (malha, linha, aviamento, embalagem)
     recalc_sales_order_item = autoridade do custo (o front só pré-visualiza):
     materiais×qtd + Σ(unit×driver_qty) + Σsetup, overhead 8% (cost_settings),
     custo unitário, margem vs preço, preço sugerido = custo/(1−margem_mín 25%)
  4. [Aprovar] por item: exige status 'concluido'; margem < 25% → só admin/manager
     (gate testado: "Margem 13.43 abaixo do mínimo 25.00" bloqueou o custo puro,
     gestor aprovou). Todos os itens aprovados → pedido 'aprovado'.
GESTOR PCP (can_plan_pcp)
  5. liberado_pcp      release_sales_order_to_pcp: só com TODOS os custos aprovados;
     cria OP-<number> 'planejada' + um item por linha do pedido + bloqueio da
     rota (trigger exige rota com etapas: "A rota escolhida não tem etapas.") +
     reserva de estoque p/ materiais vinculados a stock_item (0014).
Saída para o chão: RPC order_item_technical_sheet — quantidade por peça e
consumo total SEM nenhum valor de custo (teste garante).
```

## O pedido executado (evidência)

Cliente Atlético Vale-Fiel · 60 camisas "Preto/Grafite" a R$ 149,90 → **total R$ 8.994,00**.
Grade 8/14/18/12/8. Opções com dados iniciais: corte, costura reta, acabamento,
**Bordado escudo 6,5 mil pts/peça** (spec), gola careca.

Complementares do custo (4 operações + 5 materiais): 2ª cor do bordado (195
mil·pts = 3,25/peça), número das costas (1.080 = 18/peça, chapa própria 55),
overloque 900 min, acabamento etiqueta+hangtag+PP; malha UV 1,05 m/peça perda
7%, linha, etiquetas, embalagem. Custos finais (tabela `sales_order_item_costs`):

| materiais | operações | setups | overhead | custo industrial | custo/peça | margem | preço sugerido |
|---:|---:|---:|---:|---:|---:|---:|---:|
| R$ 2.303,18 | R$ 1.173,15 | R$ 131,00 | 8% | R$ 3.895,92 | **R$ 64,93** | 56,68% | R$ 86,57 |

Timeline gravada por trigger (`entity_events`): created → enviado → em_custo →
aprovado → liberado_pcp. OP gerada: `OP-PED-2026-0001` ('planejada'), item com
`sales_order_item_id` linkado, saldo da 1ª etapa da rota (60 peças).

## Guardas validadas na prática

1. vendedor tentou `recalc` → `Sem permissao para calcular custo.` ✓
2. custos tentou `submit` → `Sem permissao para enviar pedido.` ✓
3. ficha sem JWT (`auth.uid()` null) → `Sem permissao.` ✓ (superusuário não passa)
4. aprovar antes de recalcular → `Custo do item precisa estar concluido` ✓
5. margem abaixo do piso sem gestor → exception com números ✓; release com custo
   não aprovado → `N item(ns) sem custo aprovado.` ✓; rota sem etapas → ✓
6. CTE única (item→options) quebra no snapshot do RLS; o `addItem` real faz
   inserts sequenciais e por isso não sofre disso — padrão a preservar.

## Achados da revisão

- **F1 (baixo, produto):** `tech_status` tem 3 estados mas nada o move além de
  `em_detalhamento` — `ficha_concluida` é estado morto (nenhum SQL/UI escreve).
  O gate real de conclusão é o custo aprovado; a ficha do PCP reflete o estado
  mesmo assim. Recomendação: escrever `ficha_concluida` dentro de
  `approve_sales_order_item` (1 linha no RPC) OU remover o estado do enum depois.
  Banco = canônico Lovable, então fica de fora deste commit.
- **F2 (info):** `sales_order_item_materials` só é semeada na explosão se o
  catálogo definir `material_consumption` (o produto demo define `[]` — por
  design; quem preenche tecido/aviamento é o custo, como o pedido acima).
- **F3 (info):** o dropdown de tipo de material da UI bate 1:1 com o CHECK do
  banco (`tecido/aviamento/linha/embalagem/serviço`) — verificado nos dois lados.
- **F4 (info):** custo pode editar ops/materiais por API em pedido já aprovado
  (RLS das tabelas filhas olha só `can_cost`); a UI bloqueia (costEditable
  exige status enviado/em_custo/custo_concluido e item ≠ aprovado). Recalc não
  reabre custo aprovado (`status='aprovado'` preservado). Risco baixo; se
  quiser porta dupla, policy adicional `AND order status < 'aprovado'`.
- **F5 (ok):** setup amortizado na quantidade (chapa 38+38+55 → R$ 2,18/peça
  neste pedido) — a regra que diferencia custo de produto personalizado.

## Como reproduzir no sistema publicado (sem SQL)

`/orders` → **Novo pedido** (vendedor) → produto validado + grade + opções
(detalle bordado = mil pontos/peça) → **Enviar para custo** → papel de custo:
adicionar operações/materiais (cada gravação recalcula) → **Recalcular** →
**Aprovar** (gestor se margem < 25%) → gestor PCP: **Liberar para PCP** →
OP aparece no Torre de Controle com o saldo de etapas. Ficha técnica no botão
do pedido é a saída para a fábrica (sem valores).
