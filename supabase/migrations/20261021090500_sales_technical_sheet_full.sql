-- ============================================================================
-- Ficha tecnica do pedido: quantidade de trabalho por operacao e consumo total
--
-- Achado no teste de UI (21/10): `order_item_technical_sheet` devolvia a operacao
-- e o setor, mas nao QUANTO fazer. O PCP via "Bordado escudo" sem saber que sao
-- 6,5 mil pontos por peca (65 no pedido) nem "Costura reta" sem os 22 min/peca
-- (220 min). Sem isso a ficha nao serve para o chao de fabrica — e essa e a
-- unica saida de dados sem custo que a producao tem.
--
-- Tambem faltava o consumo total de material por item: a ficha mostrava so o
-- consumo por peca, obrigando o PCP a multiplicar na mao.
--
-- Mudanca aditiva: mesmas chaves de antes + driver/driver_qty/total_qty na
-- operacao e consumption_total no material. Nenhum valor de custo e exposto
-- (unit_cost, total_cost, setup continuam fora — ha teste garantindo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.order_item_technical_sheet(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_out jsonb;
BEGIN
  IF NOT public.is_member(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;
  SELECT jsonb_build_object(
    'order', jsonb_build_object('number', o.number, 'status', o.status,
                                'due_date', o.due_date, 'customer', c.name,
                                'released_at', o.released_at),
    'items', COALESCE(jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'description', i.description,
        'color', i.color,
        'quantity', i.quantity,
        'reference_code', i.reference_code,
        'tech_status', i.tech_status,
        'grade', (SELECT COALESCE(jsonb_object_agg(s.size, s.quantity), '{}'::jsonb)
                    FROM public.sales_order_item_sizes s WHERE s.item_id = i.id),
        'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', co.name, 'sector', co.sector,
                        'quantity', soo.quantity, 'spec', soo.spec)), '[]'::jsonb)
                      FROM public.sales_order_item_options soo
                      JOIN public.catalog_options co ON co.id = soo.option_id
                     WHERE soo.item_id = i.id),
        'operations', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'seq', op.seq, 'sector', op.sector, 'operation', op.operation,
                        'outsourced', op.outsourced,
                        'driver', op.driver, 'driver_qty', op.driver_qty,
                        'per_piece', CASE WHEN op.driver = 'lote' THEN NULL
                                     WHEN i.quantity > 0
                                     THEN round(op.driver_qty / i.quantity, 3) ELSE op.driver_qty END)
                      ORDER BY op.seq), '[]'::jsonb)
                      FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
        'materials', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'kind', m.kind, 'material', m.material, 'unit', m.unit,
                        'consumption', m.consumption, 'waste_pct', m.waste_pct,
                        'consumption_total', round(m.consumption * (1 + m.waste_pct / 100) * i.quantity, 3))
                      ORDER BY m.kind, m.material), '[]'::jsonb)
                      FROM public.sales_order_item_materials m WHERE m.item_id = i.id)
      ) ORDER BY i.line_no) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb)
  )
  INTO v_out
  FROM public.sales_orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.sales_order_items i ON i.order_id = o.id
  WHERE o.id = _order_id
  GROUP BY o.number, o.status, o.due_date, c.name, o.released_at;
  RETURN COALESCE(v_out, '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.order_item_technical_sheet(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.order_item_technical_sheet(uuid) TO authenticated;
