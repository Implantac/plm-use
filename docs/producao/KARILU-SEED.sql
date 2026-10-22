-- =============================================================================
-- KARILU-SEED.sql — catálogo real + fichas PLM para teste de ponta a ponta
-- (pedido → custo → ficha → PCP), com fotos do site público da Karilu.
--
-- Pré-requisito: APLICAR-EM-PRODUCAO.sql (docs/producao/) do bot já aplicado —
-- o DO $$ abaixo ABORTA com mensagem clara se não estiver (nada é meia-parte).
--
-- O que cria:
--   5 produtos de catálogo (validados, grade P..3G, min 10) — KAR-FUT-01..05;
--   grupos/opções de custeio no formato exato do SEED-CATALOGO-DEMO (drivers
--   peca/minuto/mil_pontos/cor, setup, price_delta 0 como no demo);
--   5 fichas PLM em tech_sheets (envelope v2: BOM, BOP, pré-custo, APLICAÇÕES
--   por posição e a FOTO) com duas versões COM INSTANTÂNEO cada — o
--   comparador A→B e o PDF saem funcionando de fábrica;
--   2 clientes DEMO para o vendedor escolher no pedido.
--   (Pedidos de demonstração prontos para os estágios do fluxo: veja o
--    KARILU-PEDIDOS.sql, que roda DEPOIS deste.)
--
-- A corrente: catalog_products.reference_code == tech_sheets.ref. Quando o
-- pedido liberado virar lote (from-orders), a ref atravessa e o drawer do PCP
-- mostra a ficha REAL — materiais, aplicações e foto — sem ponte nenhuma.
--
-- Fotos: hotlink do site público da Karilu em 315px (bom para teste interno;
-- em produção, hospedar a própria mídia — o campo aceita qualquer URL https).
-- Reexecutável: produtos upsert por code, fichas upsert por ref, clientes
-- upsert por code. Grupos/opções ON CONFLICT DO NOTHING.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.catalog_products') IS NULL THEN
    RAISE EXCEPTION 'Faltam as tabelas do fluxo de pedido. Aplique primeiro docs/producao/APLICAR-EM-PRODUCAO.sql no SQL editor do Lovable Cloud.';
  END IF;
  IF to_regclass('public.tech_sheets') IS NULL THEN
    RAISE EXCEPTION 'Tabela tech_sheets não encontrada — projeto em estado inesperado; não siga.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Clientes DEMO (segmento clube — o teste de venda de uniforme)
-- ---------------------------------------------------------------------------
INSERT INTO public.customers (code, name, trade_name, city, state, segment, notes)
VALUES
  ('KDEMO-AGS', 'Água Santa A.C. (DEMO)', 'Água Santa', 'Diadema', 'SP', 'clube de futebol',
   'Cliente sintético para teste do fluxo Karilu. Apagar junto com o seed.'),
  ('KDEMO-LAM', 'Laranja Mecânica F.C. (DEMO)', 'Laranja Mecânica', 'Limeira', 'SP', 'clube de futebol',
   'Cliente sintético para teste do fluxo Karilu. Apagar junto com o seed.')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Produtos do catálogo (fotos reais do site; preço da vitrine no base_price)
-- ---------------------------------------------------------------------------
INSERT INTO public.catalog_products
  (code, name, family, description, reference_code, base_price, min_qty, grade, status, validated_at)
VALUES
  ('KAR-FUT-01', 'Camisa Oficial Água Santa 2026 — Dourado', 'Clubes de futebol',
   'Camisa de jogo sublimada, gola redonda, manga curta. Vitrine: R$ 189,90. Foto: camisa-agua-santa-oficial-preto-617-495-104_1_315.jpg',
   'KAR-FUT-01', 189.90, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now()),
  ('KAR-FUT-02', 'Camisa Goleiro Laranja Mecânica 2026 — Azul', 'Clubes de futebol',
   'Uniforme de goleiro, manga longa, punho elástico. Vitrine: R$ 129,90. Foto: camisa-oficial-laranja-mecanica-2026-goleiro-azul_1_315.jpg',
   'KAR-FUT-02', 129.90, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now()),
  ('KAR-FUT-03', 'Camisa Térmica Dark Night 2026', 'Uniformes esportivos',
   'Segunda pele térmica manga longa. Preço estimado para teste (sem valor fixo na vitrine).',
   'KAR-FUT-03', 99.90, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now()),
  ('KAR-FUT-04', 'Camisa Futebol Wallpaper — Sublimática', 'Uniformes esportivos',
   'Estampa all-over sublimática sem custo de telas por cor. Preço estimado para teste.',
   'KAR-FUT-04', 99.90, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now()),
  ('KAR-FUT-05', 'Camiseta Oficial Operário Ferroviário 2026 — Preto', 'Clubes de futebol',
   'Linha premium torcedor. Vitrine: R$ 260,00. Foto: camisa-oficial-operario-ferroviario-2025-branca-899-134-940_1_315.jpg',
   'KAR-FUT-05', 260.00, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now())
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name, description = EXCLUDED.description,
       reference_code = EXCLUDED.reference_code, base_price = EXCLUDED.base_price,
       status = 'validado', updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Grupos de opção (mesma anatomia do SEED-CATALOGO-DEMO)
-- ---------------------------------------------------------------------------
WITH tgt AS (
  SELECT id AS product_id, code AS product_code FROM public.catalog_products
   WHERE code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
)
INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT product_id, v.code, v.name, v.selection, v.required, v.sort
  FROM tgt CROSS JOIN (VALUES
    ('producao','Produção','multi',false,1),
    ('personalizacao','Personalização','multi',true,2)
  ) AS v(code,name,selection,required,sort)
ON CONFLICT (product_id, code) DO NOTHING;

-- gola só nas linhas de clube (01/02/05)
WITH tgt AS (
  SELECT id AS product_id FROM public.catalog_products
   WHERE code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-05')
)
INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT product_id, 'gola', 'Gola', 'single', true, 3 FROM tgt
ON CONFLICT (product_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) Opções com custeio por driver (setup único = telas/chapas/digitalização)
-- ---------------------------------------------------------------------------
WITH tgt AS (
  SELECT p.id AS product_id, p.code AS product_code, g.id AS group_id, g.code AS group_code
    FROM public.catalog_products p
    JOIN public.catalog_option_groups g ON g.product_id = p.id
   WHERE p.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
)
INSERT INTO public.catalog_options
  (group_id, code, name, sector, operation_name, driver, unit_cost, setup_cost,
   outsourced, price_delta, material_consumption)
SELECT tgt.group_id, v.code, v.operation, v.sector, v.operation, v.driver,
       v.unit_cost, v.setup_cost, v.outsourced, 0, '[]'::jsonb
  FROM tgt
  JOIN (VALUES
    ('KAR-FUT-01','producao','corte','Corte','Corte','peca',2.40,0.00,false),
    ('KAR-FUT-01','producao','costura','Costura','Costura reta','minuto',0.55,0.00,false),
    ('KAR-FUT-01','producao','acabamento','Acabamento','Acabamento','peca',2.80,0.00,false),
    ('KAR-FUT-01','personalizacao','bordado','Bordado','Bordado escudo','mil_pontos',0.65,38.00,true),
    ('KAR-FUT-01','personalizacao','silk-costas','Estamparia','Silk patrocinadores','cor',1.10,45.00,false),
    ('KAR-FUT-01','personalizacao','numero-shorts','Bordado','Número shorts','mil_pontos',0.08,22.00,true),
    ('KAR-FUT-02','producao','corte','Corte','Corte','peca',2.90,0.00,false),
    ('KAR-FUT-02','producao','costura','Costura','Costura reta','minuto',0.62,0.00,false),
    ('KAR-FUT-02','producao','acabamento','Acabamento','Acabamento','peca',3.10,0.00,false),
    ('KAR-FUT-02','personalizacao','bordado','Bordado','Bordado escudo','mil_pontos',0.65,38.00,true),
    ('KAR-FUT-02','personalizacao','silk-costas','Estamparia','Silk patrocinadores','cor',1.10,45.00,false),
    ('KAR-FUT-02','personalizacao','numero-shorts','Bordado','Número shorts','mil_pontos',0.08,22.00,true),
    ('KAR-FUT-03','producao','corte','Corte','Corte','peca',2.10,0.00,false),
    ('KAR-FUT-03','producao','costura-overloque','Costura','Overloque 4 fios','minuto',0.70,0.00,false),
    ('KAR-FUT-03','personalizacao','numero-shorts','Bordado','Número shorts','mil_pontos',0.08,22.00,true),
    ('KAR-FUT-04','producao','corte','Corte','Corte','peca',1.90,0.00,false),
    ('KAR-FUT-04','producao','costura','Costura','Costura reta','minuto',0.55,0.00,false),
    ('KAR-FUT-04','personalizacao','sublimacao','Sublimação','Sublimação total','peca',8.00,0.00,true),
    ('KAR-FUT-04','personalizacao','numero-shorts','Bordado','Número shorts','mil_pontos',0.08,22.00,true),
    ('KAR-FUT-05','producao','corte','Corte','Corte','peca',2.60,0.00,false),
    ('KAR-FUT-05','producao','costura','Costura','Costura reta','minuto',0.58,0.00,false),
    ('KAR-FUT-05','producao','acabamento','Acabamento','Acabamento','peca',3.00,0.00,false),
    ('KAR-FUT-05','personalizacao','bordado','Bordado','Bordado escudo','mil_pontos',0.66,42.00,true),
    ('KAR-FUT-05','personalizacao','silk-costas','Estamparia','Silk patrocinadores','cor',1.20,48.00,false),
    ('KAR-FUT-05','personalizacao','numero-shorts','Bordado','Número shorts','mil_pontos',0.08,22.00,true)
  ) AS v(product_code,group_code,code,sector,operation,driver,unit_cost,setup_cost,outsourced)
    ON v.product_code = tgt.product_code AND v.group_code = tgt.group_code
ON CONFLICT (group_id, code) DO NOTHING;

-- gola: careca / polo (só clubes)
WITH tgt AS (
  SELECT p.id AS product_id, g.id AS group_id
    FROM public.catalog_products p
    JOIN public.catalog_option_groups g ON g.product_id = p.id AND g.code = 'gola'
   WHERE p.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-05')
)
INSERT INTO public.catalog_options
  (group_id, code, name, sector, operation_name, driver, unit_cost, setup_cost,
   outsourced, price_delta, material_consumption)
SELECT tgt.group_id, v.code, v.name, 'Costura', v.name, 'peca', v.unit_cost, 0.00, false, 0, '[]'::jsonb
  FROM tgt CROSS JOIN (VALUES ('gola-careca','Gola careca',1.10),('gola-polo','Gola polo',2.30)) AS v(code,name,unit_cost)
ON CONFLICT (group_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Fichas PLM (envelope v2) — foto + aplicações por posição + versões com
--    instantâneo (o comparador A→B nasce com dado). created_by NULL é
--    permitido pela policy de insert e é o caminho do SQL editor.
--    Diferença proposital v1.0 → v1.1 (pontos do escudo) para o diff ter o que
--    mostrar no primeiro clique.
-- ---------------------------------------------------------------------------
INSERT INTO public.tech_sheets (ref, bom, bop, versoes)
VALUES
('KAR-FUT-01',
 $karo${
  "v": 2,
  "image": "https:\/\/www.karilu.com.br/img/products/camisa-agua-santa-oficial-preto-617-495-104_1_315.jpg",
  "items": [
    {"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 140g","fornecedor":"Durst","consumo":"1.55","unidade":"m","custo":18.90},
    {"id":"b2","tipo":"Tecido","material":"Malha mesh ventilação","fornecedor":"Durst","consumo":"0.30","unidade":"m","custo":11.40},
    {"id":"b3","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"210","unidade":"m","custo":2.60},
    {"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}
  ],
  "preCost": {"targetCusto": 64, "overheadPct": 12, "markupPct": 210, "targetPreco": 189.90},
  "aplicacoes": [
    {"id":"ap1","tipo":"Bordado","posicao":"Peito esquerdo","larguraCm":9,"alturaCm":9,"pontos":6.5,"cores":6,"qtdPorPeca":1,"custoUnitario":4.20,"custoSetup":60,"obs":"Escudo com base topper para malha"},
    {"id":"ap2","tipo":"Silk","posicao":"Costas central","larguraCm":28,"alturaCm":34,"cores":4,"qtdPorPeca":1,"custoUnitario":2.40,"custoSetup":180,"obs":"3 patrocinadores, 4 cores"},
    {"id":"ap3","tipo":"Silk","posicao":"Barra frente","larguraCm":6,"alturaCm":2,"cores":1,"qtdPorPeca":1,"custoUnitario":0.60,"custoSetup":25,"obs":"logo Karilu"}
  ]
}$karo$::jsonb,
 $karb$[
    {"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":14,"custo":2.40},
    {"id":"p2","seq":2,"etapa":"Costura reta + overloque","setor":"Costura","tempoMin":22,"custo":12.10},
    {"id":"p3","seq":3,"etapa":"Bordado escudo","setor":"Bordado","tempoMin":6,"custo":4.03},
    {"id":"p4","seq":4,"etapa":"Acabamento e dobra","setor":"Acabamento","tempoMin":4,"custo":2.80},
    {"id":"p5","seq":5,"etapa":"Embalagem por kit","setor":"Expedição","tempoMin":3,"custo":1.20}
 ]$karb$::jsonb,
 $karv$[
   {"id":"v2","versao":"v1.1","data":"2026-10-22","autor":"Engenharia (seed)","status":"Aprovada","resumo":"Escudo regravado: 5.8k→6.5k pontos, fio dourado","alteracoes":["Bordado escudo 5.8→6.5 mil pontos","Custo do bordado 3.60→4.20"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 140g","fornecedor":"Durst","consumo":"1.55","unidade":"m","custo":18.90},{"id":"b2","tipo":"Tecido","material":"Malha mesh ventilação","fornecedor":"Durst","consumo":"0.30","unidade":"m","custo":11.40},{"id":"b3","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"210","unidade":"m","custo":2.60},{"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":14,"custo":2.40},{"id":"p2","seq":2,"etapa":"Costura reta + overloque","setor":"Costura","tempoMin":22,"custo":12.10},{"id":"p3","seq":3,"etapa":"Bordado escudo","setor":"Bordado","tempoMin":6,"custo":4.03},{"id":"p4","seq":4,"etapa":"Acabamento e dobra","setor":"Acabamento","tempoMin":4,"custo":2.80},{"id":"p5","seq":5,"etapa":"Embalagem por kit","setor":"Expedição","tempoMin":3,"custo":1.20}],"preCost":{"targetCusto":64,"overheadPct":12,"markupPct":210,"targetPreco":189.90}}},
   {"id":"v1","versao":"v1.0","data":"2026-10-15","autor":"Engenharia (seed)","status":"Obsoleta","resumo":"Baseline do uniforme clube 2026","alteracoes":["Ficha inicial"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 140g","fornecedor":"Durst","consumo":"1.55","unidade":"m","custo":18.90},{"id":"b2","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"210","unidade":"m","custo":2.60},{"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":14,"custo":2.40},{"id":"p2","seq":2,"etapa":"Costura reta + overloque","setor":"Costura","tempoMin":22,"custo":12.10},{"id":"p4","seq":4,"etapa":"Acabamento e dobra","setor":"Acabamento","tempoMin":4,"custo":2.80},{"id":"p5","seq":5,"etapa":"Embalagem por kit","setor":"Expedição","tempoMin":3,"custo":1.20}],"preCost":{"targetCusto":62,"overheadPct":12,"markupPct":210,"targetPreco":189.90}}}
 ]$karv$::jsonb),

('KAR-FUT-02',
 $karo${
  "v": 2,
  "image": "https:\/\/www.karilu.com.br/img/products/camisa-oficial-laranja-mecanica-2026-goleiro-azul_1_315.jpg",
  "items": [
    {"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 160g","fornecedor":"Durst","consumo":"1.85","unidade":"m","custo":21.50},
    {"id":"b2","tipo":"Aviamento","material":"Punho elástico 6cm","fornecedor":"Boto","consumo":"0.46","unidade":"m","custo":3.80},
    {"id":"b3","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"240","unidade":"m","custo":2.90},
    {"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}
  ],
  "preCost": {"targetCusto": 48, "overheadPct": 12, "markupPct": 210, "targetPreco": 129.90},
  "aplicacoes": [
    {"id":"ap1","tipo":"Bordado","posicao":"Peito esquerdo","larguraCm":8,"alturaCm":8,"pontos":5.5,"cores":4,"qtdPorPeca":1,"custoUnitario":3.60,"custoSetup":55,"obs":"Escudo versão monocromia parcial"},
    {"id":"ap2","tipo":"Silk","posicao":"Costas superior","larguraCm":26,"alturaCm":12,"cores":2,"qtdPorPeca":1,"custoUnitario":1.40,"custoSetup":90,"obs":"Nº 1 grande"}
  ]
}$karo$::jsonb,
 $karb$[
    {"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":16,"custo":2.90},
    {"id":"p2","seq":2,"etapa":"Costura manga longa","setor":"Costura","tempoMin":26,"custo":14.20},
    {"id":"p3","seq":3,"etapa":"Aplique punho elástico","setor":"Costura","tempoMin":4,"custo":2.10},
    {"id":"p4","seq":4,"etapa":"Bordado escudo","setor":"Bordado","tempoMin":5,"custo":3.35},
    {"id":"p5","seq":5,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":6,"custo":3.40}
 ]$karb$::jsonb,
 $karv$[
   {"id":"v2","versao":"v1.1","data":"2026-10-22","autor":"Engenharia (seed)","status":"Aprovada","resumo":"Punho reforçado; escudo com 5.5k pontos","alteracoes":["Malha 140→160g","Aplique de punho adicionado ao BOP"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 160g","fornecedor":"Durst","consumo":"1.85","unidade":"m","custo":21.50},{"id":"b2","tipo":"Aviamento","material":"Punho elástico 6cm","fornecedor":"Boto","consumo":"0.46","unidade":"m","custo":3.80},{"id":"b3","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"240","unidade":"m","custo":2.90},{"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":16,"custo":2.90},{"id":"p2","seq":2,"etapa":"Costura manga longa","setor":"Costura","tempoMin":26,"custo":14.20},{"id":"p3","seq":3,"etapa":"Aplique punho elástico","setor":"Costura","tempoMin":4,"custo":2.10},{"id":"p4","seq":4,"etapa":"Bordado escudo","setor":"Bordado","tempoMin":5,"custo":3.35},{"id":"p5","seq":5,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":6,"custo":3.40}],"preCost":{"targetCusto":48,"overheadPct":12,"markupPct":210,"targetPreco":129.90}}},
   {"id":"v1","versao":"v1.0","data":"2026-10-15","autor":"Engenharia (seed)","status":"Obsoleta","resumo":"Baseline goleiro 2026","alteracoes":["Ficha inicial"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster sublimático 140g","fornecedor":"Durst","consumo":"1.85","unidade":"m","custo":18.90},{"id":"b3","tipo":"Linha","material":"Poliéster 120 (tons base)","fornecedor":"Amann","consumo":"240","unidade":"m","custo":2.90},{"id":"b4","tipo":"Embalagem","material":"Tag + polybag com zip","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":4.10}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":16,"custo":2.90},{"id":"p2","seq":2,"etapa":"Costura manga longa","setor":"Costura","tempoMin":26,"custo":14.20},{"id":"p5","seq":5,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":6,"custo":3.40}],"preCost":{"targetCusto":46,"overheadPct":12,"markupPct":210,"targetPreco":129.90}}}
 ]$karv$::jsonb),

('KAR-FUT-03',
 $karo${
  "v": 2,
  "image": "https:\/\/www.karilu.com.br/img/products/camisa-termica-dark-night-2026_1_315.jpg",
  "items": [
    {"id":"b1","tipo":"Tecido","material":"Poliamida térmica 240g (segunda pele)","fornecedor":"Pettenon","consumo":"1.40","unidade":"m","custo":27.80},
    {"id":"b2","tipo":"Linha","material":"Linha poliamida texturizada","fornecedor":"Amann","consumo":"180","unidade":"m","custo":3.10},
    {"id":"b3","tipo":"Embalagem","material":"Sachê + polybag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":3.60}
  ],
  "preCost": {"targetCusto": 44, "overheadPct": 12, "markupPct": 190, "targetPreco": 99.90},
  "aplicacoes": [
    {"id":"ap1","tipo":"Silk","posicao":"Peito central","larguraCm":14,"alturaCm":6,"cores":1,"qtdPorPeca":1,"custoUnitario":0.85,"custoSetup":40,"obs":"logo refletivo"}
  ]
}$karo$::jsonb,
 $karb$[
    {"id":"p1","seq":1,"etapa":"Corte","setor":"Corte","tempoMin":12,"custo":2.10},
    {"id":"p2","seq":2,"etapa":"Overloque 4 fios + colaflat","setor":"Costura","tempoMin":19,"custo":13.30},
    {"id":"p3","seq":3,"etapa":"Ribana punho/gola","setor":"Costura","tempoMin":5,"custo":2.60},
    {"id":"p4","seq":4,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":4,"custo":1.80}
 ]$karb$::jsonb,
 $karv$[
   {"id":"v1","versao":"v1.0","data":"2026-10-22","autor":"Engenharia (seed)","status":"Aprovada","resumo":"Baseline térmica 2026 (ficha única — sem diff p/ comparar)","alteracoes":["Ficha inicial"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliamida térmica 240g (segunda pele)","fornecedor":"Pettenon","consumo":"1.40","unidade":"m","custo":27.80},{"id":"b2","tipo":"Linha","material":"Linha poliamida texturizada","fornecedor":"Amann","consumo":"180","unidade":"m","custo":3.10},{"id":"b3","tipo":"Embalagem","material":"Sachê + polybag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":3.60}],"bop":[{"id":"p1","seq":1,"etapa":"Corte","setor":"Corte","tempoMin":12,"custo":2.10},{"id":"p2","seq":2,"etapa":"Overloque 4 fios + colaflat","setor":"Costura","tempoMin":19,"custo":13.30},{"id":"p3","seq":3,"etapa":"Ribana punho/gola","setor":"Costura","tempoMin":5,"custo":2.60},{"id":"p4","seq":4,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":4,"custo":1.80}],"preCost":{"targetCusto":44,"overheadPct":12,"markupPct":190,"targetPreco":99.90}}}
 ]$karv$::jsonb),

('KAR-FUT-04',
 $karo${
  "v": 2,
  "image": "https:\/\/www.karilu.com.br/img/products/camisa-futebol-walpaper_1_315.jpg",
  "items": [
    {"id":"b1","tipo":"Tecido","material":"Dry-fit branco p/ sublimação all-over","fornecedor":"Durst","consumo":"1.60","unidade":"m","custo":15.20},
    {"id":"b2","tipo":"Linha","material":"Poliéster 120 preto","fornecedor":"Amann","consumo":"200","unidade":"m","custo":2.40},
    {"id":"b3","tipo":"Embalagem","material":"Tag + polybag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":3.90}
  ],
  "preCost": {"targetCusto": 42, "overheadPct": 10, "markupPct": 180, "targetPreco": 99.90},
  "aplicacoes": [
    {"id":"ap1","tipo":"Sublimação","posicao":"Peça toda","larguraCm":150,"alturaCm":72,"cores":0,"qtdPorPeca":1,"custoUnitario":8.00,"custoSetup":0,"obs":"all-over — papel já incluso no tecido; sem tela"}
  ]
}$karo$::jsonb,
 $karb$[
    {"id":"p1","seq":1,"etapa":"Impressão do papel transfer","setor":"Sublimação","tempoMin":8,"custo":6.20},
    {"id":"p2","seq":2,"etapa":"Calandra/prensa das peças","setor":"Sublimação","tempoMin":10,"custo":4.80},
    {"id":"p3","seq":3,"etapa":"Corte após sublimação","setor":"Corte","tempoMin":12,"custo":2.10},
    {"id":"p4","seq":4,"etapa":"Costura","setor":"Costura","tempoMin":20,"custo":11.00},
    {"id":"p5","seq":5,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":4,"custo":1.90}
 ]$karb$::jsonb,
 $karv$[
   {"id":"v1","versao":"v1.0","data":"2026-10-22","autor":"Engenharia (seed)","status":"Aprovada","resumo":"Baseline wallpaper (sem diff p/ comparar)","alteracoes":["Ficha inicial"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Dry-fit branco p/ sublimação all-over","fornecedor":"Durst","consumo":"1.60","unidade":"m","custo":15.20},{"id":"b2","tipo":"Linha","material":"Poliéster 120 preto","fornecedor":"Amann","consumo":"200","unidade":"m","custo":2.40},{"id":"b3","tipo":"Embalagem","material":"Tag + polybag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":3.90}],"bop":[{"id":"p1","seq":1,"etapa":"Impressão do papel transfer","setor":"Sublimação","tempoMin":8,"custo":6.20},{"id":"p2","seq":2,"etapa":"Calandra/prensa das peças","setor":"Sublimação","tempoMin":10,"custo":4.80},{"id":"p3","seq":3,"etapa":"Corte após sublimação","setor":"Corte","tempoMin":12,"custo":2.10},{"id":"p4","seq":4,"etapa":"Costura","setor":"Costura","tempoMin":20,"custo":11.00},{"id":"p5","seq":5,"etapa":"Acabamento e embalagem","setor":"Acabamento","tempoMin":4,"custo":1.90}],"preCost":{"targetCusto":42,"overheadPct":10,"markupPct":180,"targetPreco":99.90}}}
 ]$karv$::jsonb),

('KAR-FUT-05',
 $karo${
  "v": 2,
  "image": "https:\/\/www.karilu.com.br/img/products/camisa-oficial-operario-ferroviario-2025-branca-899-134-940_1_315.jpg",
  "items": [
    {"id":"b1","tipo":"Tecido","material":"Poliéster piquê premium 170g","fornecedor":"Cia. Tecelagem Norte","consumo":"1.62","unidade":"m","custo":24.60},
    {"id":"b2","tipo":"Tecido","material":"Ribana gola preta","fornecedor":"Cia. Tecelagem Norte","consumo":"0.18","unidade":"m","custo":9.80},
    {"id":"b3","tipo":"Aviamento","material":"Etiqueta tecida dourada","fornecedor":"Boto","consumo":"2","unidade":"un","custo":1.90},
    {"id":"b4","tipo":"Linha","material":"Poliéster 120 preto/cinza","fornecedor":"Amann","consumo":"225","unidade":"m","custo":2.80},
    {"id":"b5","tipo":"Embalagem","material":"Caixa individual + tag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":8.40}
  ],
  "preCost": {"targetCusto": 86, "overheadPct": 14, "markupPct": 190, "targetPreco": 260.00},
  "aplicacoes": [
    {"id":"ap1","tipo":"Bordado","posicao":"Peito esquerdo","larguraCm":10,"alturaCm":10,"pontos":9.2,"cores":8,"qtdPorPeca":1,"custoUnitario":6.10,"custoSetup":80,"obs":"escudo premium 8 fios + arame dourado"},
    {"id":"ap2","tipo":"Bordado","posicao":"Nuca","larguraCm":4,"alturaCm":3,"pontos":1.8,"cores":1,"qtdPorPeca":1,"custoUnitario":1.10,"custoSetup":30,"obs":"bandeira mini"},
    {"id":"ap3","tipo":"Silk","posicao":"Costas central","larguraCm":30,"alturaCm":36,"cores":5,"qtdPorPeca":1,"custoUnitario":3.10,"custoSetup":220,"obs":"5 patrocinadores"}
  ]
}$karo$::jsonb,
 $karb$[
    {"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":15,"custo":2.60},
    {"id":"p2","seq":2,"etapa":"Costura reta reforçada","setor":"Costura","tempoMin":24,"custo":13.90},
    {"id":"p3","seq":3,"etapa":"Bordado escudo + nuca","setor":"Bordado","tempoMin":9,"custo":7.20},
    {"id":"p4","seq":4,"etapa":"Etiqueta tecida e finalização","setor":"Acabamento","tempoMin":5,"custo":3.00},
    {"id":"p5","seq":5,"etapa":"Embalagem premium","setor":"Expedição","tempoMin":5,"custo":3.40}
 ]$karb$::jsonb,
 $karv$[
   {"id":"v2","versao":"v1.1","data":"2026-10-22","autor":"Engenharia (seed)","status":"Aprovada","resumo":"Escudo ganhou arame dourado (8,2k→9,2k pontos)","alteracoes":["Bordado escudo +1.0k pontos","Etiqueta dourada adicionada"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster piquê premium 170g","fornecedor":"Cia. Tecelagem Norte","consumo":"1.62","unidade":"m","custo":24.60},{"id":"b2","tipo":"Tecido","material":"Ribana gola preta","fornecedor":"Cia. Tecelagem Norte","consumo":"0.18","unidade":"m","custo":9.80},{"id":"b3","tipo":"Aviamento","material":"Etiqueta tecida dourada","fornecedor":"Boto","consumo":"2","unidade":"un","custo":1.90},{"id":"b4","tipo":"Linha","material":"Poliéster 120 preto/cinza","fornecedor":"Amann","consumo":"225","unidade":"m","custo":2.80},{"id":"b5","tipo":"Embalagem","material":"Caixa individual + tag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":8.40}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":15,"custo":2.60},{"id":"p2","seq":2,"etapa":"Costura reta reforçada","setor":"Costura","tempoMin":24,"custo":13.90},{"id":"p3","seq":3,"etapa":"Bordado escudo + nuca","setor":"Bordado","tempoMin":9,"custo":7.20},{"id":"p4","seq":4,"etapa":"Etiqueta tecida e finalização","setor":"Acabamento","tempoMin":5,"custo":3.00},{"id":"p5","seq":5,"etapa":"Embalagem premium","setor":"Expedição","tempoMin":5,"custo":3.40}],"preCost":{"targetCusto":86,"overheadPct":14,"markupPct":190,"targetPreco":260.00}}},
   {"id":"v1","versao":"v1.0","data":"2026-10-15","autor":"Engenharia (seed)","status":"Obsoleta","resumo":"Baseline premium torcedor","alteracoes":["Ficha inicial"],
    "snapshot":{"bom":[{"id":"b1","tipo":"Tecido","material":"Poliéster piquê premium 170g","fornecedor":"Cia. Tecelagem Norte","consumo":"1.62","unidade":"m","custo":24.60},{"id":"b2","tipo":"Tecido","material":"Ribana gola preta","fornecedor":"Cia. Tecelagem Norte","consumo":"0.18","unidade":"m","custo":9.80},{"id":"b4","tipo":"Linha","material":"Poliéster 120 preto/cinza","fornecedor":"Amann","consumo":"225","unidade":"m","custo":2.80},{"id":"b5","tipo":"Embalagem","material":"Caixa individual + tag","fornecedor":"Gráfica Lume","consumo":"1","unidade":"un","custo":8.40}],"bop":[{"id":"p1","seq":1,"etapa":"Corte computadorizado","setor":"Corte","tempoMin":15,"custo":2.60},{"id":"p2","seq":2,"etapa":"Costura reta reforçada","setor":"Costura","tempoMin":24,"custo":13.90},{"id":"p4","seq":4,"etapa":"Finalização","setor":"Acabamento","tempoMin":5,"custo":3.00},{"id":"p5","seq":5,"etapa":"Embalagem premium","setor":"Expedição","tempoMin":5,"custo":3.40}],"preCost":{"targetCusto":80,"overheadPct":14,"markupPct":190,"targetPreco":260.00}}}
 ]$karv$::jsonb)
ON CONFLICT (ref) DO UPDATE
   SET bom = EXCLUDED.bom, bop = EXCLUDED.bop, versoes = EXCLUDED.versoes, updated_at = now();

-- ---------------------------------------------------------------------------
-- 6) Conferência — rodar o SELECT final e comparar com o esperado:
--    5 produtos validados · 12 grupos · 30 opções · 5 fichas · 2 clientes.
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.catalog_products WHERE code LIKE 'KAR-FUT-%' AND status = 'validado') AS produtos,
  (SELECT count(*) FROM public.catalog_option_groups g JOIN public.catalog_products p ON p.id = g.product_id WHERE p.code LIKE 'KAR-FUT-%') AS grupos,
  (SELECT count(*) FROM public.catalog_options o JOIN public.catalog_option_groups g ON g.id = o.group_id JOIN public.catalog_products p ON p.id = g.product_id WHERE p.code LIKE 'KAR-FUT-%') AS opcoes,
  (SELECT count(*) FROM public.tech_sheets WHERE ref LIKE 'KAR-FUT-%') AS fichas,
  (SELECT count(*) FROM public.customers WHERE code LIKE 'KDEMO-%') AS clientes_demo;

-- Para apagar o seed inteiro (grupos/opções caem em cascata com o produto):
--   DELETE FROM public.catalog_options WHERE group_id IN (SELECT g.id FROM public.catalog_option_groups g JOIN public.catalog_products p ON p.id=g.product_id WHERE p.code LIKE 'KAR-FUT-%');
--   DELETE FROM public.catalog_products WHERE code LIKE 'KAR-FUT-%';
--   DELETE FROM public.tech_sheets WHERE ref LIKE 'KAR-FUT-%';
--   DELETE FROM public.customers WHERE code LIKE 'KDEMO-%';
