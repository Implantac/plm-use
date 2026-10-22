# Venda → Estoque: desenho e prompt para o agente Lovable

Estado verificado no repo em 2026-10-22 (nada aqui é chute — cada linha tem fonte):

- `stock_reservation` já existe e já admite OP: `ref_type` com domínio comentado
  `'pcp_lot' | 'piloto' | 'op'` (`20260708131027:213-227`), status enum
  `ativa|consumida|cancelada`, e trigger de log de eventos.
- A view `stock_balance` já **subtrai** reserva `ativa` do disponível
  (`20260708131051:18-20`): reservar por OP aparece no estoque sem mexer no motor.
- `ReservationsPanel.tsx` (inventário) já renderiza reservas.
- **Não existe reserva `ref_type='op'` criada por ninguém** — o elo que falta é a
  liberação do pedido gerar as reservas.
- Elo quebrado #1: `production_order_items` não guarda de qual item de pedido
  veio (`release:603-609` grava só reference_code/quantidade).
- Elo quebrado #2: `sales_order_item_materials.material` é texto livre, sem FK
  para `stock_item` — match por nome seria hermenêutica, não engenharia.
- Warehouse: o KARILU-BASE semeia `ALM-CENTRAL` único → default óbvio para
  reserva na liberação.

## Opções

| #   | Desenho                               | O que entrega                               | Custo                                                        | Risco                                               |
| --- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| A   | **Reserva na liberação** (este doc)   | disponível correto; OP "protege" o material | 2 colunas novas + corpo do release + 1 select na UI da ficha | baixo — definer resolveu a permissão; motor intacto |
| B   | Necessidade líquida (MRP) sem reserva | lista "o que falta comprar" agregada        | view de demanda + tela nova no inventário                    | médio — tela nova, duplica lógica de explosão       |
| C   | A e B em fases (excelência completa)  | reserva agora, compras depois               | soma controlada                                              | o de A, depois o de B                               |

Recomendação: **C começando por A**. A é pré-requisito de B: MRP confiável
precisa saber o que já está comprometido, e isso é exatamente a reserva. B vira
um prompt separado quando A estiver provada no ambiente.

## Prompt colável no agente Lovable (Fase A)

```text
Implemente a reserva de materiais na liberação de pedidos de venda (venda →
estoque, fase A). Contexto: o módulo sales está em src/lib/sales +
src/components/sales; o release é a RPC public.release_sales_order_to_pcp;
stock_reservation, stock_balance e o painel de reservas já existem.

1) Schema (drizzle migration nova, para frente — nada backward-incompatível):
- public.production_order_items ADD COLUMN sales_order_item_id uuid NULL
  REFERENCES public.sales_order_items(id) ON DELETE SET NULL; + índice.
- public.sales_order_item_materials ADD COLUMN stock_item_id uuid NULL
  REFERENCES public.stock_item(id) ON DELETE SET NULL; + índice.
Nada de backfill: linhas antigas ficam sem vínculo (NULL) e o motor tolera.

2) Reescreva release_sales_order_to_pcp(_order_id uuid) mantendo assinatura,
   SECURITY DEFINER e SET search_path = public:
- no INSERT em production_order_items, grave também sales_order_item_id =
  v_item.id (v_item já é o record do sales_order_items).
- depois de criar todos os itens do pedido, crie as reservas: para cada
  material do item (sales_order_item_materials do item em questão) com
  stock_item_id NOT NULL, insira em stock_reservation:
    item_id      = m.stock_item_id
    warehouse_id = (SELECT id FROM public.warehouse WHERE code='ALM-CENTRAL'
                    ORDER BY code LIMIT 1)  -- se nulo, pule a reserva dele
    qty          = ROUND(m.consumption * (1 + m.waste_pct/100) * i.quantity, 4)
    ref_type     = 'op'
    ref_id       = v_op
    status       = 'ativa' (default)
    notes        = 'Reservado na liberação do pedido ' || v_order.number
  Não faça RAISE por material sem vínculo: link ausente NÃO bloqueia a
  liberação — só não reserva.
- NÃO toque nas demais checagens (status aprovado, custo aprovado por item,
  rota padrão) nem na ordem delas.
- Permissões: nada de policy nova — o INSERT roda dentro do definer;
  authenticated já lê stock_balance/stock_reservation para o painel.

3) UI (mínima, sem redesenhar nada):
- No editor de materiais da ficha (TechnicalSheetDialog e onde mais houver
  linha de material editável) e no formulário "Novo material" do painel de
  custo do pedido (src/components/sales/OrderDetail.tsx): select opcional
  "Item de estoque (reserva)", busca por código e nome, valor = stock_item.id,
  gravado em sales_order_item_materials.stock_item_id.
- Na tabela de materiais do painel de custo, material com vínculo mostra o
  código do item de estoque ao lado do nome; sem vínculo, nada (não poluir).
- Não mude submit, aprovação, recalc nem o diálogo de adicionar item.

4) Prova (rode e reporte a saída):
- Libere um pedido de demonstração com pelo menos 1 material vinculado e 1 sem.
- SELECT count(*) FROM stock_reservation WHERE ref_type='op' → esperado só os
  vinculados, qty conferindo com consumo×(1+perda/100)×quantidade.
- SELECT qty_on_hand, qty_reserved FROM stock_balance do item reservado →
  qty_reserved aumentou; qty_on_hand inalterado.
- lib_sales_order para o mesmo pedido não deve duplicar reservas (só libera
  uma vez por pedido por causa do status; confirme).

5) Fora de escopo nesta fase: cancelamento de pedido revertendo reserva,
  qualquer tela de MRP/compras, consumo de reserva por passagem do PCP.
```

## Fase B (quando A estiver provada no ambiente)

Necessidade líquida por item de estoque na janela de produção: demanda das OPs
liberadas-em-produção (agora 100% rastreável via `sales_order_item_id` +
vínculo do material) − `qty_on_hand` + `qty_reserved` − compras em trânsito
(quando existir módulo de compra). Entrega como view + card no inventário. O
prompt se escreve com A rodada, porque a definição de "demanda" depende de o
PCP consumir reserva na baixa (decisão operacional, não técnica).
