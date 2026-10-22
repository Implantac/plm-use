-- =============================================================================
-- KARILU-BASE.sql — dados-base para o sistema inteiro (o resto do loop)
--
-- Este é o TERCEIRO tijolo (a ordem é esta, todos no SQL editor do Lovable):
--   1) docs/producao/APLICAR-EM-PRODUCAO.sql  (tabelas do fluxo de pedido)
--   2) docs/producao/KARILU-SEED.sql          (catálogo + fichas com foto)
--   3) docs/producao/KARILU-PEDIDOS.sql       (5 pedidos demo + OP no PCP)
--   4) ESTE ARQUIVO                           (base mestre do resto das telas)
--
-- O que preenche, tudo amarrado nos KAR-FUT-01..05 para as telas conversarem
-- entre si no teste real:
--   /suppliers + /supplier-portal  — 5 fornecedores reais da ficha (Durst…)
--                                     e 2 ordens de compra enviadas;
--   /materials                     — 12 materiais com custo/unidade coerentes
--                                     com as fichas PLM (malha 18,90/m…);
--   /development + /approvals      — 5 referências (COM FOTO em image_url!)
--                                     em estágios diferentes + 20 gates do
--                                     workflow (conceito→…→lançamento);
--   /pcp (tela de lotes)           — 3 lotes (um em produção 45%, um planejado,
--                                     um concluído) + 2 ocorrências (aberta e
--                                     resolvida) para a esteira de tratativa;
--   /quality                       — 2 CAPAs (uma Corretiva Aberta, uma
--                                     Preventiva na etapa 'Ação') apontando pros
--                                     defeitos dos lotes;
--   /inventory (Almoxarifado)      — 1 armazém, 6 itens de estoque com
--                                     lead/safety e entradas que alimentam a
--                                     visão stock_balance;
--   bônus: garante o papel ADMIN para etcsuporte889@gmail.com (idempotente —
--     se você rodou o CONCEDER-ADMIN.sql, isto não muda nada).
--
-- O que NÃO precisa de seed (e por quê): o PCP de chão (OP → lote → gaveta com
-- ficha) é PROJEÇÃO de production_orders (ordersToLotes) — já vem vivo do
-- KARILU-PEDIDOS (pedido E virou OP-KAR…-0005). Apontar passagem e aprovar
-- gates são AÇÕES do teste real: continuam vazios de propósito.
--
-- Reexecutável: upsert por chave natural (code/external_key/codigo) ou guard
-- NOT EXISTS onde a tabela não tem unique (gates, ocorrências, CAPA,
-- movimentos). RLS: o SQL editor roda como papel privilegiado — INSERT/UPDATE
-- passam; na UI, as policies do app decidem (por isso o admin).
-- =============================================================================

DO $do$
DECLARE
  v_uid uuid;
  v_n   int;
  v_url01 text := 'https:' || chr(47) || chr(47) || 'www.karilu.com.br/img/products/camisa-agua-santa-oficial-preto-617-495-104_1_315.jpg';
  v_url02 text := 'https:' || chr(47) || chr(47) || 'www.karilu.com.br/img/products/camisa-oficial-laranja-mecanica-2026-goleiro-azul_1_315.jpg';
  v_url03 text := 'https:' || chr(47) || chr(47) || 'www.karilu.com.br/img/products/camisa-termica-dark-night-2026_1_315.jpg';
  v_url04 text := 'https:' || chr(47) || chr(47) || 'www.karilu.com.br/img/products/camisa-futebol-walpaper_1_315.jpg';
  v_url05 text := 'https:' || chr(47) || chr(47) || 'www.karilu.com.br/img/products/camisa-oficial-operario-ferroviario-2025-branca-899-134-940_1_315.jpg';
BEGIN
  -- -------------------------------------------------------------------------
  -- 0) Pré-requisitos e usuário dono da base
  -- -------------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM public.tech_sheets WHERE ref LIKE 'KAR-FUT-%';
  IF v_n < 5 THEN
    RAISE EXCEPTION 'Rode antes os seeds KARILU (faltam fichas: %/5). Ordem: APLICAR-EM-PRODUCAO.sql, KARILU-SEED.sql, KARILU-PEDIDOS.sql e então este arquivo.', v_n;
  END IF;
  IF to_regclass('public."references"') IS NULL OR to_regclass('public.stock_item') IS NULL THEN
    RAISE EXCEPTION 'Schema do app incompleto (references/stock_item ausentes) — projeto em estado inesperado.';
  END IF;

  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'etcsuporte889@gmail.com';
  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário em auth.users — crie a conta em /login e rode de novo.';
  END IF;

  -- Acesso total (idempotente; equivale ao CONCEDER-ADMIN.sql)
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'admin'::public.app_role FROM auth.users u
   WHERE lower(u.email) = 'etcsuporte889@gmail.com'
  ON CONFLICT (user_id, role) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 1) Fornecedores (os mesmos citados nas fichas — vira um mundo só)
  -- -------------------------------------------------------------------------
  INSERT INTO public.suppliers (code, name, tipo, cidade, uf, status, contato_nome, contato_email, notes)
  VALUES
    ('SUP-DURST', 'Durst Têxtil', 'tecido', 'Nova Friburgo', 'RJ', 'ativo', 'Comercial', 'vendas@durst.example', 'Malhas sublimáticas e dry-fit. Fornecedor base dos KAR-FUT.'),
    ('SUP-AMANN', 'Amann_THREADs Brasil', 'linha', 'São Paulo', 'SP', 'ativo', 'Posição', 'br@amann.example', 'Linha poliéster 120 e poliamida texturizada.'),
    ('SUP-BOTO', 'Boto Aviamentos', 'aviamento', 'Nova Friburgo', 'RJ', 'ativo', 'Balcao', 'pedidos@boto.example', 'Punho elástico, etiquetas tecidas.'),
    ('SUP-LUME', 'Gráfica Lume', 'embalagem', 'Diadema', 'SP', 'ativo', 'Arte-final', 'arte@lume.example', 'Tags, polybags, caixas premium.'),
    ('SUP-CTN', 'Cia. Tecelagem Norte', 'tecido', 'Bom Despacho', 'MG', 'ativo', 'Representação', 'contato@ctn.example', 'Piquê premium e ribana (linha clube).')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, notes = EXCLUDED.notes;

  -- -------------------------------------------------------------------------
  -- 2) Materiais (custos batem com o BOM das fichas KAR-FUT)
  -- -------------------------------------------------------------------------
  INSERT INTO public.materials (external_key, name, material_type, supplier, unit, unit_cost, sku, notes)
  VALUES
    ('KAR-MAT-01', 'Poliéster sublimático 140g',            'Tecido',    'Durst', 'm', 18.90, 'KAR-TEC-140', 'Base da camisa Água Santa'),
    ('KAR-MAT-02', 'Malha mesh ventilação',                  'Tecido',    'Durst', 'm', 11.40, 'KAR-TEC-MESH', 'Painéis laterais'),
    ('KAR-MAT-03', 'Poliéster sublimático 160g',             'Tecido',    'Durst', 'm', 21.50, 'KAR-TEC-160', 'Goleiro Laranja Mecânica'),
    ('KAR-MAT-04', 'Poliamida térmica 240g (segunda pele)',  'Tecido',    'Pettenon', 'm', 27.80, 'KAR-TEC-TERM', 'Dark Night'),
    ('KAR-MAT-05', 'Dry-fit branco p/ sublimação all-over',  'Tecido',    'Durst', 'm', 15.20, 'KAR-TEC-DRY', 'Wallpaper'),
    ('KAR-MAT-06', 'Poliéster piquê premium 170g',           'Tecido',    'Cia. Tecelagem Norte', 'm', 24.60, 'KAR-TEC-PIQ', 'Operário premium'),
    ('KAR-MAT-07', 'Ribana gola preta',                      'Tecido',    'Cia. Tecelagem Norte', 'm', 9.80, 'KAR-TEC-RIB', 'Golas e punhos'),
    ('KAR-MAT-08', 'Punho elástico 6cm',                     'Aviamento', 'Boto', 'm', 3.80, 'KAR-AVI-PUNHO', 'Goleiro'),
    ('KAR-MAT-09', 'Etiqueta tecida dourada',                'Aviamento', 'Boto', 'un', 0.95, 'KAR-AVI-ETQ', '2 peças/peça na linha premium'),
    ('KAR-MAT-10', 'Linha poliéster 120 (tons base)',        'Linha',     'Amann', 'm', 0.0125, 'KAR-LIN-120', '~2,60 por 210 m'),
    ('KAR-MAT-11', 'Tag + polybag com zip',                  'Embalagem', 'Gráfica Lume', 'un', 4.10, 'KAR-EMB-PBZ', 'Padrão clube'),
    ('KAR-MAT-12', 'Caixa individual + tag premium',         'Embalagem', 'Gráfica Lume', 'un', 8.40, 'KAR-EMB-CX', 'Linha torcedor premium')
  ON CONFLICT (external_key) DO UPDATE SET unit_cost = EXCLUDED.unit_cost, notes = EXCLUDED.notes;

  -- -------------------------------------------------------------------------
  -- 3) Referências no core do PLM — COM FOTO (image_url) e em estágios
  --    diferentes do workflow, para /development e /approvals nascerem vivas.
  -- -------------------------------------------------------------------------
  INSERT INTO public."references" (code, name, collection_id, theme, line, season, status, priority, target_cost, target_price, image_url, metadata)
  VALUES
    ('KAR-FUT-01', 'Camisa Oficial Água Santa 2026 — Dourado', 'KARILU26', 'Futebol & torcida', 'Clubes', '2026-1', 'FINALIZADA', 'ALTA', 64, 189.90, v_url01,
     '{"origem": "KARILU-BASE", "ficha": "KAR-FUT-01"}'::jsonb),
    ('KAR-FUT-02', 'Camisa Goleiro Laranja Mecânica 2026 — Azul', 'KARILU26', 'Futebol & torcida', 'Clubes', '2026-1', 'PRODUCAO', 'ALTA', 48, 129.90, v_url02,
     '{"origem": "KARILU-BASE", "ficha": "KAR-FUT-02"}'::jsonb),
    ('KAR-FUT-03', 'Camisa Térmica Dark Night 2026', 'KARILU26', 'Performance', 'Térmicos', '2026-1', 'ENGENHARIA', 'MEDIA', 44, 99.90, v_url03,
     '{"origem": "KARILU-BASE", "ficha": "KAR-FUT-03"}'::jsonb),
    ('KAR-FUT-04', 'Camisa Futebol Wallpaper — Sublimática', 'KARILU26', 'Performance', 'Sublimáticos', '2026-1', 'APROVACAO', 'MEDIA', 42, 99.90, v_url04,
     '{"origem": "KARILU-BASE", "ficha": "KAR-FUT-04"}'::jsonb),
    ('KAR-FUT-05', 'Camiseta Oficial Operário Ferroviário 2026 — Preto', 'KARILU26', 'Futebol & torcida', 'Premium torcedor', '2026-1', 'MODELAGEM', 'URGENTE', 86, 260.00, v_url05,
     '{"origem": "KARILU-BASE", "ficha": "KAR-FUT-05"}'::jsonb)
  ON CONFLICT (code) DO UPDATE
     SET name = EXCLUDED.name, status = EXCLUDED.status, image_url = EXCLUDED.image_url,
         target_cost = EXCLUDED.target_cost, target_price = EXCLUDED.target_price,
         metadata = EXCLUDED.metadata, updated_at = now();

  -- -------------------------------------------------------------------------
  -- 4) Gates do workflow (id do gate = linha 2 do hook use-reference-gates).
  --    Regra: gates abaixo do estágio atual = aprovados (com atraso plausível);
  --    o gate do estágio atual = pendente (é o que cai na fila de /approvals).
  -- -------------------------------------------------------------------------
  WITH v(gate_ref, gate_id, gstatus, parecer, dias_atraso) AS (
    VALUES
      ('KAR-FUT-01','conceito','aprovado','Croqui e cartela aprovados (seed)',40),
      ('KAR-FUT-01','modelagem','aprovado','Molde base e grade validados (seed)',35),
      ('KAR-FUT-01','piloto','aprovado','Piloto aprovado em prova (seed)',30),
      ('KAR-FUT-01','engenharia','aprovado','Ficha técnica e custo aprovados (seed)',25),
      ('KAR-FUT-01','producao','aprovado','Lote-piloto de produção ok (seed)',20),
      ('KAR-FUT-01','lancamento','aprovado','Coleção lançada (seed)',12),
      ('KAR-FUT-02','conceito','aprovado','Croqui aprovado (seed)',30),
      ('KAR-FUT-02','modelagem','aprovado','Molde goleiro validado (seed)',26),
      ('KAR-FUT-02','piloto','aprovado','Prova do piloto ok (seed)',21),
      ('KAR-FUT-02','engenharia','aprovado','BOM/BOP aprovados (seed)',15),
      ('KAR-FUT-02','producao','aprovado','OP em andamento — ok (seed)',6),
      ('KAR-FUT-02','lancamento','pendente',NULL,NULL),
      ('KAR-FUT-03','conceito','aprovado','Térmico: briefing ok (seed)',18),
      ('KAR-FUT-03','modelagem','aprovado','Molde segunda pele validado (seed)',14),
      ('KAR-FUT-03','piloto','aprovado','Teste de compressão aprovado (seed)',9),
      ('KAR-FUT-03','engenharia','pendente',NULL,NULL),
      ('KAR-FUT-04','conceito','aprovado','All-over aprovado (seed)',16),
      ('KAR-FUT-04','modelagem','aprovado','Grade sublimática ok (seed)',12),
      ('KAR-FUT-04','piloto','pendente',NULL,NULL),
      ('KAR-FUT-05','conceito','aprovado','Briefing premium aprovado (seed)',5),
      ('KAR-FUT-05','modelagem','pendente',NULL,NULL)
  )
  INSERT INTO public.reference_gate (reference_id, gate, status, parecer, due_date, decided_at, created_by, updated_by)
  SELECT r.id, v.gate_id, v.gstatus, v.parecer,
         CASE WHEN v.gstatus = 'pendente' THEN current_date + 7 END,
         CASE WHEN v.gstatus = 'aprovado' THEN now() - (v.dias_atraso || ' days')::interval END,
         v_uid, v_uid
    FROM v JOIN public."references" r ON r.code = v.gate_ref
   WHERE NOT EXISTS (
     SELECT 1 FROM public.reference_gate g
      WHERE g.reference_id = r.id AND g.gate = v.gate_id);

  -- -------------------------------------------------------------------------
  -- 5) PCP de lotes (tela própria do app): 3 lotes KAR + 2 ocorrências.
  --    (A esteira OP→lote→ficha do pedido E já vem do KARILU-PEDIDOS.)
  -- -------------------------------------------------------------------------
  INSERT INTO public.pcp_lots (code, model, collection, quantity, current_stage, due_date, status, priority, progress_percent, metadata, created_by)
  VALUES
    ('LOT-KAR-001', 'Camisa Oficial Água Santa 2026 — Dourado', 'KARILU 2026', 120, 'Costura', current_date + 6, 'em_producao', 'alta', 45,
     '{"origem":"KARILU-BASE","reference_code":"KAR-FUT-01"}'::jsonb, v_uid),
    ('LOT-KAR-002', 'Camisa Futebol Wallpaper — Sublimática', 'KARILU 2026', 90, 'Corte', current_date + 10, 'planejado', 'media', 0,
     '{"origem":"KARILU-BASE","reference_code":"KAR-FUT-04"}'::jsonb, v_uid),
    ('LOT-KAR-003', 'Camisa Goleiro Laranja Mecânica 2026 — Azul', 'KARILU 2026', 150, 'Expedição', current_date - 2, 'concluido', 'media', 100,
     '{"origem":"KARILU-BASE","reference_code":"KAR-FUT-02"}'::jsonb, v_uid)
  ON CONFLICT (code) DO UPDATE SET progress_percent = EXCLUDED.progress_percent,
     current_stage = EXCLUDED.current_stage, status = EXCLUDED.status, updated_at = now();

  INSERT INTO public.pcp_occurrences (lot_id, type, severity, description, sector, status, resolved_at)
  SELECT l.id, v.otype, v.sev::public.occurrence_severity, v.odesc, v.sector,
         v.st::public.occurrence_status,
         CASE WHEN v.st = 'resolvida' THEN now() - interval '1 day' END
    FROM public.pcp_lots l JOIN (VALUES
      ('LOT-KAR-001', 'qualidade', 'warning',  'Desvio de ponto na gola — 3 peças retificadas na própria estação (DEMO)', 'Costura',   'aberta'),
      ('LOT-KAR-001', 'producao',  'critical', 'Agulha da overloque quebrou; 25 min parados (DEMO)',                          'Costura',   'resolvida')
    ) AS v(lot, otype, sev, odesc, sector, st) ON v.lot = l.code
   WHERE NOT EXISTS (SELECT 1 FROM public.pcp_occurrences o WHERE o.description = v.odesc);

  -- -------------------------------------------------------------------------
  -- 6) Qualidade: CAPA amarrada aos defeitos acima
  -- -------------------------------------------------------------------------
  INSERT INTO public.quality_capa (ref, lote, defeito, setor, fornecedor, tipo, responsavel, prazo, status)
  SELECT v.ref, v.lote, v.defeito, v.setor, v.forn, v.tipo, v.resp,
         (current_date + v.prazo_dias), v.st
    FROM (VALUES
      ('KAR-FUT-01', 'LOT-KAR-001', 'Desvio de ponto na gola recorrente', 'Costura', NULL, 'Corretiva',
       'Time Qualidade (DEMO)', 5::int, 'Aberta'),
      ('KAR-FUT-02', 'LOT-KAR-003', 'Assentamento do silk nas costas varia por lote', 'Estamparia', 'Gráfica Lume',
       'Preventiva', 'Time Estamparia (DEMO)', 12, 'Ação')
    ) AS v(ref, lote, defeito, setor, forn, tipo, resp, prazo_dias, st)
   WHERE NOT EXISTS (SELECT 1 FROM public.quality_capa q WHERE q.defeito = v.defeito);

  -- ---------------------------------------------------------------------------
  -- 7) Almoxarifado: 1 armazém + 6 itens + entradas (a view stock_balance
  --    deriva dos movimentos; created_by NOT NULL exige o v_uid daqui)
  -- -------------------------------------------------------------------------
  INSERT INTO public.warehouse (code, name, type, location, created_by)
  VALUES ('ALM-CENTRAL', 'Almoxarifado Central', 'central', 'Galpão 1 — Diadema', v_uid)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO public.stock_item (code, name, category, unit, abc_class, unit_price, lead_time_days, safety_stock, reorder_point, demand_avg_daily, supplier_default, created_by)
  VALUES
    ('STK-TEC-140',  'Poliéster sublimático 140g',  'tecido',    'm',  'A', 18.90, 12, 400,  800,  95, 'Durst Têxtil', v_uid),
    ('STK-TEC-160',  'Poliéster sublimático 160g',  'tecido',    'm',  'A', 21.50, 12, 300,  600,  70, 'Durst Têxtil', v_uid),
    ('STK-TEC-DRY',  'Dry-fit branco sublimação',   'tecido',    'm',  'A', 15.20, 10, 250,  500,  60, 'Durst Têxtil', v_uid),
    ('STK-LIN-120',  'Linha poliéster 120 (tons)',  'insumo',    'm',  'C', 0.0125, 20, 3000, 6000, 800,'Amann_THREADs Brasil', v_uid),
    ('STK-AVI-ETQ',  'Etiqueta tecida dourada',     'etiqueta',  'un', 'B', 0.95,  25, 400,  800,  100,'Boto Aviamentos', v_uid),
    ('STK-EMB-PBZ',  'Tag + polybag com zip',       'embalagem', 'un', 'B', 4.10,  8,  600,  1200, 150,'Gráfica Lume', v_uid)
  ON CONFLICT (code) DO UPDATE SET unit_price = EXCLUDED.unit_price, supplier_default = EXCLUDED.supplier_default;

  INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, lot_code, justification, created_by)
  SELECT si.id, w.id, 'in', v.qty, 'recebimento', v.lote, 'Seed KARILU-BASE — entrada inicial DEMO', v_uid
    FROM public.stock_item si CROSS JOIN public.warehouse w
    JOIN (VALUES
      ('STK-TEC-140', 1800, 'ROLO-DURST-88'),
      ('STK-TEC-160', 1200, 'ROLO-DURST-89'),
      ('STK-TEC-DRY', 1500, 'ROLO-DURST-90'),
      ('STK-LIN-120', 9000, 'CAIXA-AMANN-12'),
      ('STK-AVI-ETQ', 2400, 'LOTE-BOTO-7'),
      ('STK-EMB-PBZ', 3000, 'PALLETE-LUME-3')
    ) AS v(code, qty, lote) ON v.code = si.code
   WHERE w.code = 'ALM-CENTRAL'
     AND NOT EXISTS (
       SELECT 1 FROM public.stock_movement m
        WHERE m.item_id = si.id AND m.justification = 'Seed KARILU-BASE — entrada inicial DEMO');

  -- -------------------------------------------------------------------------
  -- 8) Compras: ordens para os fornecedores (portal do fornecedor vê)
  -- -------------------------------------------------------------------------
  INSERT INTO public.supplier_orders (supplier_id, codigo, reference_id, descricao, quantidade, unidade, prazo, status, observacoes)
  SELECT s.id, v.codigo, r.id, v.odesc, v.qt, v.un, current_date + v.prazo, v.st, v.obs
    FROM (VALUES
      ('SUP-DURST', 'OC-KAR-0001', 'KAR-FUT-02', 'Poliéster sublimático 160g — reposição Lote Goleiro', 1200, 'm', 10, 'enviada',
       'Gerada pelo seed DEMO — resposta do fornecedor é teste real'),
      ('SUP-AMANN', 'OC-KAR-0002', 'KAR-FUT-01', 'Linha poliéster 120 tons base (dourado, preto, branco)', 30000, 'm', 14, 'enviada',
       'Seed DEMO')
    ) AS v(scod, codigo, ref, odesc, qt, un, prazo, st, obs)
    JOIN public.suppliers s ON s.code = v.scod
    LEFT JOIN public."references" r ON r.code = v.ref
   ON CONFLICT (codigo) DO NOTHING;

  RAISE NOTICE 'KARILU-BASE aplicado. Usuário-âncora: %', v_uid;
END
$do$;

-- ---------------------------------------------------------------------------
-- Conferência — esperado: fornecedores 5 · materiais 12 · referências 5 ·
-- gates 21 (6+6+4+3+2) · pendentes 4 · lotes 3 · ocorrências 2 · CAPA 2 ·
-- itens estoque 6 · movimentos 6 · OCs 2
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.suppliers WHERE code LIKE 'SUP-%' AND code IN ('SUP-DURST','SUP-AMANN','SUP-BOTO','SUP-LUME','SUP-CTN')) AS fornecedores,
  (SELECT count(*) FROM public.materials WHERE external_key LIKE 'KAR-MAT-%') AS materiais,
  (SELECT count(*) FROM public."references" WHERE code LIKE 'KAR-FUT-%') AS referencias,
  (SELECT count(*) FROM public.reference_gate g JOIN public."references" r ON r.id = g.reference_id WHERE r.code LIKE 'KAR-FUT-%') AS gates,
  (SELECT count(*) FROM public.reference_gate g JOIN public."references" r ON r.id = g.reference_id WHERE r.code LIKE 'KAR-FUT-%' AND g.status = 'pendente') AS gates_pendentes,
  (SELECT count(*) FROM public.pcp_lots WHERE code LIKE 'LOT-KAR-%') AS lotes,
  (SELECT count(*) FROM public.quality_capa WHERE lote LIKE 'LOT-KAR-%') AS capas,
  (SELECT count(*) FROM public.stock_item WHERE code LIKE 'STK-%') AS itens_estoque,
  (SELECT count(*) FROM public.supplier_orders WHERE codigo LIKE 'OC-KAR-%') AS ordens_compra;

-- A foto chegou onde? (referências com image_url = 5)
SELECT r.code, r.status, count(g.id) FILTER (WHERE g.status = 'pendente') AS na_fila_aprovacoes,
       (r.image_url IS NOT NULL) AS tem_foto
  FROM public."references" r
  LEFT JOIN public.reference_gate g ON g.reference_id = r.id
 WHERE r.code LIKE 'KAR-FUT-%'
 GROUP BY r.code, r.status, r.image_url
 ORDER BY r.code;

-- Rollback (na ordem; apaga SÓ o que este arquivo criou):
--   DELETE FROM public.supplier_orders WHERE codigo LIKE 'OC-KAR-%';
--   DELETE FROM public.stock_movement WHERE justification = 'Seed KARILU-BASE — entrada inicial DEMO';
--   DELETE FROM public.stock_item WHERE code LIKE 'STK-%';
--   DELETE FROM public.warehouse WHERE code = 'ALM-CENTRAL';
--   DELETE FROM public.quality_capa WHERE lote LIKE 'LOT-KAR-%';
--   DELETE FROM public.pcp_occurrences WHERE description LIKE '%(DEMO)';
--   DELETE FROM public.pcp_lots WHERE code LIKE 'LOT-KAR-%';
--   DELETE FROM public.reference_gate WHERE reference_id IN (SELECT id FROM public."references" WHERE code LIKE 'KAR-FUT-%');
--   DELETE FROM public."references" WHERE code LIKE 'KAR-FUT-%';
--   DELETE FROM public.materials WHERE external_key LIKE 'KAR-MAT-%';
--   DELETE FROM public.suppliers WHERE code IN ('SUP-DURST','SUP-AMANN','SUP-BOTO','SUP-LUME','SUP-CTN');
