-- KARILU-ROTAS — rotas PCP + configurações para os 5 produtos do catálogo.
-- Por que: release_sales_order_to_pcp exige que o item tenha
-- catalog_products.configuration_id apontando para uma configuração com rota
-- default (configuration_routes.is_default); sem isso o pedido aprovado morre
-- no último passo com 'Item X sem rota padrao'. Os seeds anteriores nunca
-- criaram essa cadeia.
-- Onde rodar: Lovable > More > Database > Manage > SQL editor (Ctrl+Enter).
-- Reexecutável: rotas por codigo (ON CONFLICT DO NOTHING), etapas idem para
-- nao atropelar edicao manual de rota, configuracoes guardadas por NOT EXISTS,
-- vinculo so atualiza quando esta de fato diferente (IS DISTINCT FROM).
-- Comentarios apenas com `--` (o editor recusa `//` cru).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Rotas por perfil de producao. O desenho segue a linha real da vitrine:
--    camisa sublimada com personalizacao bordada (agua-santa), linha com
--    so bordado (goleiro/termica/operario) e a all-over puramente
--    sublimatica. Etapas fora do perfil NAO entram: o saldo do item nasce na
--    primeira etapa e so anda por passagem, etapa sobrando = travamento no
--    chao de fabrica. Bordado nasce outsourced=true porque no SEED a opcao
--    de bordado marca o setor como terceirizado.
-- ---------------------------------------------------------------------------
INSERT INTO public.production_routes (code, name, description, active)
VALUES
  ('RT-SUBL-BORD', 'Camisa sublimatica + bordado',
   'Fluxo padrao dos clubes com estampa sublimatica e personalizacao bordada.', true),
  ('RT-BORD', 'Camisa com bordado',
   'Calcado e costurado que recebem apenas bordado na personalizacao.', true),
  ('RT-SUBL', 'Camisa 100% sublimatica',
   'All-over sem bordado: a estampa antecede o acabamento.', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.production_route_steps
  (route_id, sequence, sector, operation, mandatory, outsourced)
SELECT r.id, v.sequence, v.sector, v.operation, v.mandatory, v.outsourced
  FROM public.production_routes r
  JOIN (VALUES
    ('RT-SUBL-BORD', 1, 'Corte',       'Corte',                    true,  false),
    ('RT-SUBL-BORD', 2, 'Costura',     'Costura',                  true,  false),
    ('RT-SUBL-BORD', 3, 'Sublimacao',  'Estampa sublimatica',      true,  false),
    ('RT-SUBL-BORD', 4, 'Bordado',     'Bordado escudo e numeros', true,  true),
    ('RT-SUBL-BORD', 5, 'Acabamento',  'Acabamento',               true,  false),
    ('RT-SUBL-BORD', 6, 'Expedicao',   'Conferencia e expedicao',  true,  false),
    ('RT-BORD',      1, 'Corte',       'Corte',                    true,  false),
    ('RT-BORD',      2, 'Costura',     'Costura',                  true,  false),
    ('RT-BORD',      3, 'Bordado',     'Bordado escudo e numeros', true,  true),
    ('RT-BORD',      4, 'Acabamento',  'Acabamento',               true,  false),
    ('RT-BORD',      5, 'Expedicao',   'Conferencia e expedicao',  true,  false),
    ('RT-SUBL',      1, 'Corte',       'Corte',                    true,  false),
    ('RT-SUBL',      2, 'Costura',     'Costura',                  true,  false),
    ('RT-SUBL',      3, 'Sublimacao',  'Estampa all-over',         true,  false),
    ('RT-SUBL',      4, 'Acabamento',  'Acabamento',               true,  false),
    ('RT-SUBL',      5, 'Expedicao',   'Conferencia e expedicao',  true,  false)
  ) AS v(route_code, sequence, sector, operation, mandatory, outsourced)
    ON v.route_code = r.code
ON CONFLICT (route_id, sequence) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Uma configuracao por produto (nome convencionado com o sufixo `-- PCP`
--    para o guard de reexecucao ser possivel sem constraint nova).
-- ---------------------------------------------------------------------------
INSERT INTO public.product_configurations (base_product, name, description, active)
SELECT 'Camisa', cp.name || ' — PCP',
       'Configuracao gerada por KARILU-ROTAS para o produto ' || cp.code, true
  FROM public.catalog_products cp
 WHERE cp.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
   AND NOT EXISTS (
     SELECT 1 FROM public.product_configurations pc
      WHERE pc.name = cp.name || ' — PCP'
   );

-- ---------------------------------------------------------------------------
-- 3) Vinculo configuracao -> rota default, por perfil.
--    01 e 05: estampa + bordado. 04: so sublimatica. 02 e 03: so bordado.
-- ---------------------------------------------------------------------------
INSERT INTO public.configuration_routes (configuration_id, route_id, is_default)
SELECT pc.id, r.id, true
  FROM public.catalog_products cp
  JOIN public.product_configurations pc ON pc.name = cp.name || ' — PCP'
  JOIN public.production_routes r
    ON r.code = CASE
         WHEN cp.code = 'KAR-FUT-04'      THEN 'RT-SUBL'
         WHEN cp.code IN ('KAR-FUT-01','KAR-FUT-05') THEN 'RT-SUBL-BORD'
         ELSE 'RT-BORD'
       END
 WHERE cp.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
 ON CONFLICT (configuration_id, route_id) DO UPDATE SET is_default = true;

-- ---------------------------------------------------------------------------
-- 4) Aponta o catalogo para a configuracao (o elo que o release consulta).
-- ---------------------------------------------------------------------------
UPDATE public.catalog_products cp
   SET configuration_id = pc.id,
       updated_at = now()
  FROM public.product_configurations pc
 WHERE pc.name = cp.name || ' — PCP'
   AND cp.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
   AND cp.configuration_id IS DISTINCT FROM pc.id;

COMMIT;

-- Prova: os 5 produtos devem retornar com configuracao, rota default e as
-- etapas certas (6/5/5). Qualquer linha ausente = elo da cadeia que falhou.
SELECT cp.code,
       cp.name,
       pc.name  AS configuracao,
       r.code   AS rota,
       count(s.id) AS etapas
  FROM public.catalog_products cp
  JOIN public.product_configurations pc ON pc.id = cp.configuration_id
  JOIN public.configuration_routes cr ON cr.configuration_id = pc.id AND cr.is_default
  JOIN public.production_routes r ON r.id = cr.route_id
  LEFT JOIN public.production_route_steps s ON s.route_id = r.id
 WHERE cp.code IN ('KAR-FUT-01','KAR-FUT-02','KAR-FUT-03','KAR-FUT-04','KAR-FUT-05')
 GROUP BY cp.code, cp.name, pc.name, r.code
 ORDER BY cp.code;
