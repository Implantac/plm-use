-- ATIVACAO MANUAL NO LOVABLE: dados comerciais e consumo por item.
-- Execute apenas no banco correto, no SQL editor do Lovable, apos backup.
-- PREREQUISITO: 2026-10-27_DETALHES-PRODUCAO.sql ja aplicado com sucesso.
-- A transacao cancela tudo se o preflight ou a verificacao final falhar.
-- Reexecutavel; nao apaga fichas, pedidos ou materiais e nao altera a ficha padrao.
-- Aplicar antes do Publish. Se o SQL anterior for reaplicado depois deste,
-- reaplique ESTE arquivo em seguida: ambos redefinem funcoes compartilhadas.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('public.sales_orders') IS NULL
     OR to_regclass('public.sales_order_items') IS NULL
     OR to_regclass('public.sales_order_item_sizes') IS NULL
     OR to_regclass('public.sales_order_item_options') IS NULL
     OR to_regclass('public.sales_order_item_operations') IS NULL
     OR to_regclass('public.sales_order_item_materials') IS NULL
     OR to_regclass('public.sales_order_item_detail_sheets') IS NULL
     OR to_regclass('public.sales_order_item_detail_groups') IS NULL
     OR to_regclass('public.catalog_products') IS NULL
     OR to_regclass('public.catalog_options') IS NULL
     OR to_regclass('public.customers') IS NULL
     OR to_regclass('public.tech_sheets') IS NULL
     OR to_regprocedure('public.can_sell(uuid)') IS NULL
     OR to_regprocedure('public.can_cost(uuid)') IS NULL
     OR to_regprocedure('public.is_member(uuid)') IS NULL
     OR to_regprocedure('public.order_detail_scalar(jsonb,text)') IS NULL
     OR to_regprocedure('public.start_order_item_details(uuid)') IS NULL
     OR to_regprocedure('public.recalc_sales_order_item(uuid)') IS NULL
     OR to_regprocedure('public.order_item_technical_sheet(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Pre-requisitos incompletos: aplique primeiro os SQLs do fluxo de pedidos e de detalhes de producao. Nenhuma alteracao realizada.';
  END IF;
END $preflight$;

-- Detalhes comerciais e consumo por material na ficha transacional do pedido.
-- A ficha padrao permanece intacta; textos comercial/custo sao independentes.

ALTER TABLE public.sales_order_item_detail_groups
  ADD COLUMN IF NOT EXISTS commercial_detail text NOT NULL DEFAULT '';
ALTER TABLE public.sales_order_item_materials
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

-- A revisao acompanha ate edicoes feitas no painel de custo anterior. O recalc
-- altera somente total_cost e por isso nao invalida revisoes de consumo.
CREATE OR REPLACE FUNCTION public.bump_order_material_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['total_cost', 'revision', 'updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['total_cost', 'revision', 'updated_at']) THEN
    NEW.revision := OLD.revision + 1;
  ELSE
    NEW.revision := OLD.revision;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bump_order_material_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_order_material_revision ON public.sales_order_item_materials;
CREATE TRIGGER trg_order_material_revision BEFORE UPDATE ON public.sales_order_item_materials
  FOR EACH ROW EXECUTE FUNCTION public.bump_order_material_revision();

-- Comercial edita enquanto o pedido e rascunho; trava pedido antes do item,
-- como submit_sales_order(), e espelha a permissao do vendedor/gestor.
CREATE OR REPLACE FUNCTION public.assert_order_item_commercial_editable(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order_id uuid; v_status text; v_seller uuid;
BEGIN
  IF NOT public.can_sell(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para detalhar pelo comercial.';
  END IF;
  SELECT order_id INTO v_order_id FROM public.sales_order_items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT status, seller_id INTO v_status, v_seller FROM public.sales_orders
    WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  IF v_status <> 'rascunho' OR NOT (COALESCE(v_seller = auth.uid(), false) OR public.can_cost(auth.uid())) THEN
    RAISE EXCEPTION 'Detalhes do comercial bloqueados: somente o vendedor ou gestor no rascunho.';
  END IF;
  PERFORM 1 FROM public.sales_order_items WHERE id = _item_id AND order_id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_order_item_commercial_editable(uuid) FROM PUBLIC, anon, authenticated;

-- A verificacao preliminar evita que um pedido ainda rascunho, travado pelo
-- comercial, dispute locks inversos com uma tentativa de custo. O status e
-- conferido novamente sob lock antes de qualquer gravacao.
CREATE OR REPLACE FUNCTION public.assert_order_item_detail_editable(_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item public.sales_order_items%ROWTYPE; v_status text;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para detalhar este item.';
  END IF;
  SELECT o.status INTO v_status FROM public.sales_order_items i
    JOIN public.sales_orders o ON o.id = i.order_id WHERE i.id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  IF v_status NOT IN ('enviado', 'em_custo', 'custo_concluido') THEN
    RAISE EXCEPTION 'Detalhes bloqueados: pedido fora do custo ou item aprovado.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  IF v_item.cost_status = 'aprovado' THEN
    RAISE EXCEPTION 'Detalhes bloqueados: pedido fora do custo ou item aprovado.';
  END IF;
  SELECT status INTO v_status FROM public.sales_orders WHERE id = v_item.order_id FOR UPDATE;
  IF v_status NOT IN ('enviado', 'em_custo', 'custo_concluido') THEN
    RAISE EXCEPTION 'Detalhes bloqueados: pedido fora do custo ou item aprovado.';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_order_item_detail_editable(uuid) FROM PUBLIC, anon, authenticated;

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
    'initialized', true, 'base_ref', v_sheet.base_ref, 'base_found', v_sheet.base_found,
    'base_updated_at', v_sheet.base_updated_at, 'base_captured_at', v_sheet.base_captured_at,
    'base', v_sheet.base_technical,
    'groups', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.group_name, 'commercial_detail', g.commercial_detail,
      'detail', g.detail, 'revision', g.revision, 'sort_order', g.sort_order
    ) ORDER BY g.sort_order, g.group_name, g.id)
      FROM public.sales_order_item_detail_groups g WHERE g.item_id = _item_id), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_order_item_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_item_details(uuid) TO authenticated;

-- Inicializador interno chamado somente apos o gate de cada papel.
CREATE OR REPLACE FUNCTION public.initialize_order_item_detail_sheet(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text; v_template public.tech_sheets%ROWTYPE; v_found boolean := false;
  v_initialized boolean := false; v_existing_found boolean := false;
  v_bom jsonb := '[]'::jsonb; v_bop jsonb := '[]'::jsonb; v_apps jsonb := '[]'::jsonb;
  v_materiais jsonb := '[]'::jsonb; v_operacoes jsonb := '[]'::jsonb;
  v_aplicacoes jsonb := '[]'::jsonb; v_base jsonb := '{}'::jsonb; v_foto text;
BEGIN
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
REVOKE ALL ON FUNCTION public.initialize_order_item_detail_sheet(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_order_item_details(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  RETURN public.initialize_order_item_detail_sheet(_item_id);
END $$;
REVOKE ALL ON FUNCTION public.start_order_item_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_order_item_details(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_order_item_commercial_details(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_order_item_commercial_editable(_item_id);
  RETURN public.initialize_order_item_detail_sheet(_item_id);
END $$;
REVOKE ALL ON FUNCTION public.start_order_item_commercial_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_order_item_commercial_details(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_order_detail_group_internal(
  _item_id uuid, _group_id uuid, _name text, _detail text, _expected_revision integer, _commercial boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group public.sales_order_item_detail_groups%ROWTYPE; v_name text; v_order integer;
BEGIN
  IF _commercial THEN PERFORM public.assert_order_item_commercial_editable(_item_id);
  ELSE PERFORM public.assert_order_item_detail_editable(_item_id); END IF;
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
      INSERT INTO public.sales_order_item_detail_groups
        (item_id, group_name, commercial_detail, detail, sort_order, updated_by)
      VALUES (_item_id, v_name, CASE WHEN _commercial THEN _detail ELSE '' END,
              CASE WHEN _commercial THEN '' ELSE _detail END, v_order, auth.uid())
      RETURNING * INTO v_group;
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
    UPDATE public.sales_order_item_detail_groups
       SET commercial_detail = CASE WHEN _commercial THEN _detail ELSE commercial_detail END,
           detail = CASE WHEN _commercial THEN detail ELSE _detail END,
           revision = revision + 1, updated_by = auth.uid(), updated_at = now()
     WHERE id = _group_id RETURNING * INTO v_group;
  END IF;
  RETURN jsonb_build_object('id', v_group.id, 'name', v_group.group_name,
    'commercial_detail', v_group.commercial_detail, 'detail', v_group.detail,
    'revision', v_group.revision, 'sort_order', v_group.sort_order);
END $$;
REVOKE ALL ON FUNCTION public.save_order_detail_group_internal(uuid, uuid, text, text, integer, boolean)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_order_item_detail_group(
  _item_id uuid, _group_id uuid, _name text, _detail text, _expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.save_order_detail_group_internal(_item_id, _group_id, _name, _detail, _expected_revision, false);
END $$;
REVOKE ALL ON FUNCTION public.save_order_item_detail_group(uuid, uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_item_detail_group(uuid, uuid, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_order_item_commercial_group(
  _item_id uuid, _group_id uuid, _name text, _detail text, _expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.save_order_detail_group_internal(_item_id, _group_id, _name, _detail, _expected_revision, true);
END $$;
REVOKE ALL ON FUNCTION public.save_order_item_commercial_group(uuid, uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_item_commercial_group(uuid, uuid, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_detail_group_internal(
  _item_id uuid, _group_id uuid, _expected_revision integer, _commercial boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group public.sales_order_item_detail_groups%ROWTYPE;
BEGIN
  IF _commercial THEN PERFORM public.assert_order_item_commercial_editable(_item_id);
  ELSE PERFORM public.assert_order_item_detail_editable(_item_id); END IF;
  SELECT * INTO v_group FROM public.sales_order_item_detail_groups
    WHERE id = _group_id AND item_id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grupo nao encontrado ou removido por outro usuario.'; END IF;
  IF _expected_revision IS NULL OR v_group.revision <> _expected_revision THEN
    RAISE EXCEPTION 'Grupo alterado por outro usuario. Atualize antes de remover.';
  END IF;
  IF _commercial AND btrim(v_group.detail) <> '' THEN
    RAISE EXCEPTION 'Grupo possui complemento do custo e nao pode ser excluido pelo comercial.';
  END IF;
  IF NOT _commercial AND btrim(v_group.commercial_detail) <> '' THEN
    RAISE EXCEPTION 'Grupo possui detalhes do comercial e nao pode ser excluido pelo custo.';
  END IF;
  DELETE FROM public.sales_order_item_detail_groups WHERE id = _group_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_order_detail_group_internal(uuid, uuid, integer, boolean)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_item_detail_group(
  _item_id uuid, _group_id uuid, _expected_revision integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.delete_order_detail_group_internal(_item_id, _group_id, _expected_revision, false);
END $$;
REVOKE ALL ON FUNCTION public.delete_order_item_detail_group(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_item_detail_group(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_item_commercial_group(
  _item_id uuid, _group_id uuid, _expected_revision integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.delete_order_detail_group_internal(_item_id, _group_id, _expected_revision, true);
END $$;
REVOKE ALL ON FUNCTION public.delete_order_item_commercial_group(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_item_commercial_group(uuid, uuid, integer) TO authenticated;

-- Leitura de materiais com custo so para can_cost; nao depende da coluna
-- opcional de estoque presente em alguns projetos.
CREATE OR REPLACE FUNCTION public.list_order_item_material_consumption(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN RAISE EXCEPTION 'Sem permissao para consultar o consumo com custo.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_order_items WHERE id = _item_id) THEN
    RAISE EXCEPTION 'Item nao encontrado.';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', m.id, 'kind', m.kind, 'material', m.material, 'unit', m.unit,
    'consumption', m.consumption, 'waste_pct', m.waste_pct, 'unit_cost', m.unit_cost,
    'total_cost', m.total_cost, 'source', m.source, 'revision', m.revision
  ) ORDER BY m.created_at, m.id) FROM public.sales_order_item_materials m WHERE m.item_id = _item_id), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_order_item_material_consumption(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_order_item_material_consumption(uuid) TO authenticated;

-- Consumo e custo unitario vivem nas linhas do item, nunca na ficha padrao.
-- Gravar e recalcular sao uma unica transacao; revisao evita perder edicoes.
CREATE OR REPLACE FUNCTION public.save_order_item_material_consumption(
  _item_id uuid, _material_id uuid, _kind text, _material text, _unit text,
  _consumption numeric, _waste_pct numeric, _unit_cost numeric, _expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_material public.sales_order_item_materials%ROWTYPE; v_kind text; v_name text; v_unit text;
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  IF _consumption IS NULL OR _consumption::text IN ('NaN', 'Infinity', '-Infinity')
     OR _consumption < 0 OR _consumption > 99999999.9999 THEN
    RAISE EXCEPTION 'Informe consumo por peca entre 0 e 99999999.9999.';
  END IF;
  IF _waste_pct IS NULL OR _waste_pct::text IN ('NaN', 'Infinity', '-Infinity')
     OR _waste_pct < 0 OR _waste_pct > 999.99 THEN
    RAISE EXCEPTION 'Informe perda entre 0 e 999.99 por cento.';
  END IF;
  IF _unit_cost IS NULL OR _unit_cost::text IN ('NaN', 'Infinity', '-Infinity')
     OR _unit_cost < 0 OR _unit_cost > 99999999.9999 THEN
    RAISE EXCEPTION 'Informe custo unitario entre 0 e 99999999.9999.';
  END IF;
  IF _material_id IS NULL THEN
    v_kind := lower(btrim(COALESCE(_kind, '')));
    v_name := btrim(COALESCE(_material, '')); v_unit := btrim(COALESCE(_unit, ''));
    IF v_kind NOT IN ('tecido','aviamento','linha','embalagem','servico') THEN
      RAISE EXCEPTION 'Tipo de material invalido.';
    END IF;
    IF char_length(v_name) NOT BETWEEN 1 AND 160 OR char_length(v_unit) NOT BETWEEN 1 AND 12 THEN
      RAISE EXCEPTION 'Informe material (ate 160 caracteres) e unidade (ate 12 caracteres).';
    END IF;
    IF COALESCE(_expected_revision, 0) <> 0 THEN RAISE EXCEPTION 'Revisao invalida para novo material.'; END IF;
    INSERT INTO public.sales_order_item_materials
      (item_id, kind, material, unit, consumption, waste_pct, unit_cost, source)
    VALUES (_item_id, v_kind, v_name, v_unit, _consumption, _waste_pct, _unit_cost, 'custo')
    RETURNING * INTO v_material;
  ELSE
    SELECT * INTO v_material FROM public.sales_order_item_materials
      WHERE id = _material_id AND item_id = _item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Material nao encontrado neste item.'; END IF;
    IF _expected_revision IS NULL OR v_material.revision <> _expected_revision THEN
      RAISE EXCEPTION 'Material alterado por outro usuario. Atualize antes de salvar.';
    END IF;
    UPDATE public.sales_order_item_materials
       SET consumption = _consumption, waste_pct = _waste_pct, unit_cost = _unit_cost
     WHERE id = _material_id RETURNING * INTO v_material;
  END IF;
  PERFORM public.recalc_sales_order_item(_item_id);
  SELECT * INTO v_material FROM public.sales_order_item_materials WHERE id = v_material.id;
  RETURN jsonb_build_object('id', v_material.id, 'kind', v_material.kind, 'material', v_material.material,
    'unit', v_material.unit, 'consumption', v_material.consumption, 'waste_pct', v_material.waste_pct,
    'unit_cost', v_material.unit_cost, 'total_cost', v_material.total_cost, 'source', v_material.source,
    'revision', v_material.revision);
END $$;
REVOKE ALL ON FUNCTION public.save_order_item_material_consumption(uuid, uuid, text, text, text, numeric, numeric, numeric, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_order_item_material_consumption(uuid, uuid, text, text, text, numeric, numeric, numeric, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_item_material_consumption(
  _item_id uuid, _material_id uuid, _expected_revision integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_material public.sales_order_item_materials%ROWTYPE;
BEGIN
  PERFORM public.assert_order_item_detail_editable(_item_id);
  SELECT * INTO v_material FROM public.sales_order_item_materials
    WHERE id = _material_id AND item_id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material nao encontrado neste item.'; END IF;
  IF _expected_revision IS NULL OR v_material.revision <> _expected_revision THEN
    RAISE EXCEPTION 'Material alterado por outro usuario. Atualize antes de remover.';
  END IF;
  IF v_material.source <> 'custo' THEN
    RAISE EXCEPTION 'Material do catalogo nao pode ser removido aqui.';
  END IF;
  DELETE FROM public.sales_order_item_materials WHERE id = _material_id;
  PERFORM public.recalc_sales_order_item(_item_id);
END $$;
REVOKE ALL ON FUNCTION public.delete_order_item_material_consumption(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_item_material_consumption(uuid, uuid, integer) TO authenticated;

-- Ficha e OP recebem os dois textos e os consumos, sem campos financeiros.
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
        'commercial_notes', i.notes,
        'detail_groups', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                             'name', g.group_name, 'commercial_detail', g.commercial_detail, 'detail', g.detail)
                           ORDER BY g.sort_order, g.group_name, g.id), '[]'::jsonb)
                            FROM public.sales_order_item_detail_groups g
                           WHERE g.item_id = i.id AND (btrim(g.commercial_detail) <> '' OR btrim(g.detail) <> '')) ,
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

DO $verificacao$
BEGIN
  IF to_regprocedure('public.start_order_item_commercial_details(uuid)') IS NULL
     OR to_regprocedure('public.save_order_item_commercial_group(uuid,uuid,text,text,integer)') IS NULL
     OR to_regprocedure('public.list_order_item_material_consumption(uuid)') IS NULL
     OR to_regprocedure('public.save_order_item_material_consumption(uuid,uuid,text,text,text,numeric,numeric,numeric,integer)') IS NULL
     OR to_regprocedure('public.delete_order_item_material_consumption(uuid,uuid,integer)') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_order_item_detail_groups' AND column_name='commercial_detail')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_order_item_materials' AND column_name='revision')
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.sales_order_item_materials'::regclass AND tgname='trg_order_material_revision' AND NOT tgisinternal AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'Falhou a verificacao final; toda a transacao sera desfeita.';
  END IF;
END $verificacao$;
COMMIT;

-- Verificacao de instalacao sem consultar dados de pedidos:
SELECT to_regprocedure('public.start_order_item_commercial_details(uuid)') AS iniciar_comercial,
       to_regprocedure('public.list_order_item_material_consumption(uuid)') AS listar_consumo_custo,
       to_regprocedure('public.save_order_item_material_consumption(uuid,uuid,text,text,text,numeric,numeric,numeric,integer)') AS salvar_consumo_custo,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_order_item_detail_groups' AND column_name='commercial_detail') AS coluna_texto_comercial,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_order_item_materials' AND column_name='revision') AS coluna_revisao_consumo;
