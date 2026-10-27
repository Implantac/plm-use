-- Detalhes de producao por item, sem alterar a ficha padrao do produto.
-- A base e fotografada uma vez por item, usando apenas campos tecnicos sem custo.
-- O backend exige papel de custo e item ainda editavel. Producao recebe apenas
-- a projecao sem valores via order_item_technical_sheet().

CREATE TABLE IF NOT EXISTS public.sales_order_item_detail_sheets (
  item_id uuid PRIMARY KEY REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  base_ref text,
  base_found boolean NOT NULL DEFAULT false,
  base_updated_at timestamptz,
  base_captured_at timestamptz,
  base_technical jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT so_detail_base_object CHECK (jsonb_typeof(base_technical) = 'object')
);
ALTER TABLE public.sales_order_item_detail_sheets
  ADD COLUMN IF NOT EXISTS base_captured_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sales_order_item_detail_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.sales_order_item_detail_sheets(item_id) ON DELETE CASCADE,
  group_name text NOT NULL CHECK (char_length(btrim(group_name)) BETWEEN 1 AND 60),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 15000),
  sort_order integer NOT NULL DEFAULT 1000,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS so_detail_groups_name_unique
  ON public.sales_order_item_detail_groups (item_id, lower(btrim(group_name)));
CREATE INDEX IF NOT EXISTS so_detail_groups_item_order_idx
  ON public.sales_order_item_detail_groups (item_id, sort_order, group_name);

-- Leitura para membros e escrita somente por RPC autenticada. A captura da
-- ficha base guarda uma whitelist tecnica, nunca o documento financeiro bruto.
ALTER TABLE public.sales_order_item_detail_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_item_detail_groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_order_item_detail_sheets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.sales_order_item_detail_groups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sales_order_item_detail_sheets TO authenticated;
GRANT SELECT ON public.sales_order_item_detail_groups TO authenticated;
GRANT ALL ON public.sales_order_item_detail_sheets TO service_role;
GRANT ALL ON public.sales_order_item_detail_groups TO service_role;
DROP POLICY IF EXISTS so_detail_sheets_member_read ON public.sales_order_item_detail_sheets;
CREATE POLICY so_detail_sheets_member_read ON public.sales_order_item_detail_sheets
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS so_detail_groups_member_read ON public.sales_order_item_detail_groups;
CREATE POLICY so_detail_groups_member_read ON public.sales_order_item_detail_groups
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

-- Bloqueia a mesma linha de item que a aprovacao bloqueia, prevenindo edicao
-- concorrente com aprovacao; pedido e verificado depois, na mesma transacao.
CREATE OR REPLACE FUNCTION public.assert_order_item_detail_editable(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item public.sales_order_items%ROWTYPE; v_status text;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para detalhar este item.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  -- Uma OP em liberacao ja tem item aprovado; sair antes de bloquear o pedido
  -- evita disputar a ordem inversa de locks do release_sales_order_to_pcp.
  IF v_item.cost_status = 'aprovado' THEN
    RAISE EXCEPTION 'Detalhes bloqueados: pedido fora do custo ou item aprovado.';
  END IF;
  SELECT status INTO v_status FROM public.sales_orders WHERE id = v_item.order_id FOR UPDATE;
  IF v_status NOT IN ('enviado', 'em_custo', 'custo_concluido') THEN
    RAISE EXCEPTION 'Detalhes bloqueados: pedido fora do custo ou item aprovado.';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_order_item_detail_editable(uuid) FROM PUBLIC, anon, authenticated;

-- A mesma leitura alimenta o editor. Os grupos vazios so aparecem no editor;
-- a ficha da fabrica nao e poluida por grupos ainda nao preenchidos.
CREATE OR REPLACE FUNCTION public.get_order_item_details(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sheet public.sales_order_item_detail_sheets%ROWTYPE;
BEGIN
  IF NOT public.is_member(auth.uid()) THEN RAISE EXCEPTION 'Sem permissao.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_order_items WHERE id = _item_id) THEN
    RAISE EXCEPTION 'Item nao encontrado.';
  END IF;
  SELECT * INTO v_sheet FROM public.sales_order_item_detail_sheets WHERE item_id = _item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('initialized', false, 'groups', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'initialized', true,
    'base_ref', v_sheet.base_ref,
    'base_found', v_sheet.base_found,
    'base_updated_at', v_sheet.base_updated_at,
    'base_captured_at', v_sheet.base_captured_at,
    'base', v_sheet.base_technical,
    'groups', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.group_name, 'detail', g.detail,
      'revision', g.revision, 'sort_order', g.sort_order
    ) ORDER BY g.sort_order, g.group_name, g.id)
      FROM public.sales_order_item_detail_groups g WHERE g.item_id = _item_id), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_order_item_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_item_details(uuid) TO authenticated;

-- Projeta somente escalares, impedindo que um objeto/array aninhado em um
-- campo tecnico carregue, como texto JSON, campos financeiros ocultos.
CREATE OR REPLACE FUNCTION public.order_detail_scalar(_object jsonb, _key text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
  SELECT CASE WHEN jsonb_typeof(_object -> _key) IN ('string', 'number', 'boolean')
    THEN _object ->> _key ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public.order_detail_scalar(jsonb, text) FROM PUBLIC, anon, authenticated;

-- Material, operacao e aplicacao sao copiados como referencia de producao,
-- nao sao lancados novamente no custo nem escrevem na ficha reutilizavel.
-- Sem referencia igual ou sem ficha, o item nasce vazio e isso fica explicito.
CREATE OR REPLACE FUNCTION public.start_order_item_details(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text; v_template public.tech_sheets%ROWTYPE; v_found boolean := false;
  v_initialized boolean := false; v_existing_found boolean := false;
  v_bom jsonb := '[]'::jsonb; v_bop jsonb := '[]'::jsonb; v_apps jsonb := '[]'::jsonb;
  v_materiais jsonb := '[]'::jsonb; v_operacoes jsonb := '[]'::jsonb;
  v_aplicacoes jsonb := '[]'::jsonb; v_base jsonb := '{}'::jsonb; v_foto text;
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  SELECT base_found INTO v_existing_found FROM public.sales_order_item_detail_sheets WHERE item_id = _item_id;
  v_initialized := FOUND;
  -- Se a base nao existia, uma nova abertura pode captura-la depois que a
  -- referencia for vinculada; textos dos grupos nunca sao substituidos.
  IF NOT v_initialized OR NOT v_existing_found THEN
    SELECT COALESCE(NULLIF(btrim(i.reference_code), ''), NULLIF(btrim(p.reference_code), ''))
      INTO v_ref
      FROM public.sales_order_items i JOIN public.catalog_products p ON p.id = i.catalog_product_id
      WHERE i.id = _item_id;
    IF v_ref IS NOT NULL THEN
      SELECT * INTO v_template FROM public.tech_sheets WHERE ref = v_ref;
      v_found := FOUND;
    END IF;
    IF v_found THEN
      IF jsonb_typeof(v_template.bom) = 'array' THEN
        v_bom := v_template.bom;
      ELSIF jsonb_typeof(v_template.bom) = 'object' THEN
        IF jsonb_typeof(v_template.bom->'items') = 'array' THEN v_bom := v_template.bom->'items'; END IF;
        IF jsonb_typeof(v_template.bom->'aplicacoes') = 'array' THEN v_apps := v_template.bom->'aplicacoes'; END IF;
        v_foto := public.order_detail_scalar(v_template.bom, 'image');
        IF v_foto NOT LIKE 'https://%' THEN v_foto := NULL; END IF;
      END IF;
      IF jsonb_typeof(v_template.bop) = 'array' THEN v_bop := v_template.bop; END IF;
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tipo', public.order_detail_scalar(x, 'tipo'), 'material', public.order_detail_scalar(x, 'material'),
        'fornecedor', public.order_detail_scalar(x, 'fornecedor'), 'lote', public.order_detail_scalar(x, 'lote'),
        'consumo', public.order_detail_scalar(x, 'consumo'), 'unidade', public.order_detail_scalar(x, 'unidade')
      ) ORDER BY n), '[]'::jsonb) INTO v_materiais
        FROM jsonb_array_elements(v_bom) WITH ORDINALITY AS v(x, n)
        WHERE jsonb_typeof(x) = 'object';
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'seq', public.order_detail_scalar(x, 'seq'), 'setor', public.order_detail_scalar(x, 'setor'),
        'etapa', public.order_detail_scalar(x, 'etapa'), 'tempo_min', public.order_detail_scalar(x, 'tempoMin'),
        'responsavel', public.order_detail_scalar(x, 'responsavel')
      ) ORDER BY n), '[]'::jsonb) INTO v_operacoes
        FROM jsonb_array_elements(v_bop) WITH ORDINALITY AS v(x, n)
        WHERE jsonb_typeof(x) = 'object';
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tipo', public.order_detail_scalar(x, 'tipo'), 'posicao', public.order_detail_scalar(x, 'posicao'),
        'arte', public.order_detail_scalar(x, 'arte'), 'largura_cm', public.order_detail_scalar(x, 'larguraCm'),
        'altura_cm', public.order_detail_scalar(x, 'alturaCm'), 'pontos', public.order_detail_scalar(x, 'pontos'),
        'cores', public.order_detail_scalar(x, 'cores'), 'qtd_por_peca', public.order_detail_scalar(x, 'qtdPorPeca'),
        'observacao', public.order_detail_scalar(x, 'obs')
      ) ORDER BY n), '[]'::jsonb) INTO v_aplicacoes
        FROM jsonb_array_elements(v_apps) WITH ORDINALITY AS v(x, n)
        WHERE jsonb_typeof(x) = 'object';
      v_base := jsonb_build_object('materiais', v_materiais, 'operacoes', v_operacoes,
                                    'aplicacoes', v_aplicacoes, 'foto', v_foto);
    END IF;
    IF NOT v_initialized THEN
      INSERT INTO public.sales_order_item_detail_sheets
        (item_id, base_ref, base_found, base_updated_at, base_captured_at, base_technical, created_by)
      VALUES (_item_id, v_ref, v_found, CASE WHEN v_found THEN v_template.updated_at ELSE NULL END,
              CASE WHEN v_found THEN now() ELSE NULL END, v_base, auth.uid());
      INSERT INTO public.sales_order_item_detail_groups (item_id, group_name, sort_order, updated_by)
      SELECT _item_id, v.group_name, v.sort_order, auth.uid()
        FROM (VALUES ('Detalhes', 10), ('Tecido', 20), ('Bordado', 30), ('Costura', 40),
                     ('Acabamento', 50), ('Expedição', 60), ('Estampa', 70),
                     ('Lavanderia', 80), ('Corte', 90)) AS v(group_name, sort_order);
    ELSIF v_found THEN
      UPDATE public.sales_order_item_detail_sheets
         SET base_ref = v_ref, base_found = true, base_updated_at = v_template.updated_at,
             base_captured_at = now(), base_technical = v_base
       WHERE item_id = _item_id AND NOT base_found;
    END IF;
  END IF;
  RETURN public.get_order_item_details(_item_id);
END $$;
REVOKE ALL ON FUNCTION public.start_order_item_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_order_item_details(uuid) TO authenticated;

-- Controle otimista por revisao impede um operador de apagar a edicao de outro.
CREATE OR REPLACE FUNCTION public.save_order_item_detail_group(
  _item_id uuid, _group_id uuid, _name text, _detail text, _expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group public.sales_order_item_detail_groups%ROWTYPE; v_name text; v_order integer;
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  IF NOT EXISTS (SELECT 1 FROM public.sales_order_item_detail_sheets WHERE item_id = _item_id) THEN
    RAISE EXCEPTION 'Inicie a ficha do item antes de salvar.';
  END IF;
  IF _detail IS NULL OR char_length(_detail) > 15000 THEN
    RAISE EXCEPTION 'Detalhe invalido: limite de 15000 caracteres.';
  END IF;
  IF _group_id IS NULL THEN
    v_name := btrim(COALESCE(_name, ''));
    IF char_length(v_name) NOT BETWEEN 1 AND 60 THEN
      RAISE EXCEPTION 'Informe um nome de grupo com ate 60 caracteres.';
    END IF;
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'Revisao invalida para grupo novo.';
    END IF;
    SELECT COALESCE(max(sort_order), 0) + 10 INTO v_order
      FROM public.sales_order_item_detail_groups WHERE item_id = _item_id;
    BEGIN
      INSERT INTO public.sales_order_item_detail_groups (item_id, group_name, detail, sort_order, updated_by)
      VALUES (_item_id, v_name, _detail, v_order, auth.uid()) RETURNING * INTO v_group;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Ja existe um grupo com este nome.';
    END;
  ELSE
    SELECT * INTO v_group FROM public.sales_order_item_detail_groups
      WHERE id = _group_id AND item_id = _item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Grupo nao encontrado ou removido por outro usuario.'; END IF;
    IF _expected_revision IS NULL OR v_group.revision <> _expected_revision THEN
      RAISE EXCEPTION 'Grupo alterado por outro usuario. Atualize antes de salvar.';
    END IF;
    UPDATE public.sales_order_item_detail_groups SET detail = _detail,
      revision = revision + 1, updated_by = auth.uid(), updated_at = now()
      WHERE id = _group_id RETURNING * INTO v_group;
  END IF;
  RETURN jsonb_build_object('id', v_group.id, 'name', v_group.group_name, 'detail', v_group.detail,
                           'revision', v_group.revision, 'sort_order', v_group.sort_order);
END $$;
REVOKE ALL ON FUNCTION public.save_order_item_detail_group(uuid, uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_item_detail_group(uuid, uuid, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_item_detail_group(
  _item_id uuid, _group_id uuid, _expected_revision integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group public.sales_order_item_detail_groups%ROWTYPE;
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  SELECT * INTO v_group FROM public.sales_order_item_detail_groups
    WHERE id = _group_id AND item_id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grupo nao encontrado ou removido por outro usuario.'; END IF;
  IF _expected_revision IS NULL OR v_group.revision <> _expected_revision THEN
    RAISE EXCEPTION 'Grupo alterado por outro usuario. Atualize antes de remover.';
  END IF;
  DELETE FROM public.sales_order_item_detail_groups WHERE id = _group_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_order_item_detail_group(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_item_detail_group(uuid, uuid, integer) TO authenticated;

-- A ficha e a OP compartilham a mesma saida tecnica sem custo.
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
        'detail_groups', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                             'name', g.group_name, 'detail', g.detail)
                           ORDER BY g.sort_order, g.group_name, g.id), '[]'::jsonb)
                            FROM public.sales_order_item_detail_groups g
                           WHERE g.item_id = i.id AND btrim(g.detail) <> ''),
        'base_snapshot', (SELECT jsonb_build_object('ref', s.base_ref, 'found', s.base_found,
                                  'captured_at', s.base_captured_at, 'data', s.base_technical)
                           FROM public.sales_order_item_detail_sheets s WHERE s.item_id = i.id),
        'grade', (SELECT COALESCE(jsonb_object_agg(s.size, s.quantity), '{}'::jsonb)
                    FROM public.sales_order_item_sizes s WHERE s.item_id = i.id),
        'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', co.name, 'sector', co.sector, 'quantity', soo.quantity,
                        -- spec e json livre; passar apenas o driver numerico evita
                        -- entregar campos financeiros adicionais a producao.
                        'spec', CASE WHEN jsonb_typeof(soo.spec->'driver_qty') IN ('number', 'string')
                          AND soo.spec->>'driver_qty' ~ '^[-+]?([0-9]+([.][0-9]+)?|[.][0-9]+)([eE][-+]?[0-9]+)?$'
                          THEN jsonb_build_object('driver_qty', soo.spec->'driver_qty') ELSE '{}'::jsonb END)), '[]'::jsonb)
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
