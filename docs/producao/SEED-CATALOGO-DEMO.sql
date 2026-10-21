-- =============================================================================
-- SEED OPCIONAL — produto de demonstração no Catálogo técnico.
--
-- Para que serve: depois de aplicar APLICAR-EM-PRODUCAO.sql, o catálogo está
-- vazio. Sem produto com status 'validado' não existe item de pedido possível
-- (o vendedor escolhe produto do catálogo, não digita especificação).
--
-- Este script cria UM produto de teste — "Camisa futebol (DEMO)" — com grade
-- P..3G, mínimo de 10 peças e 3 grupos de opção no padrão Karilu
-- (produção, personalização, gola). Não substitui o cadastro real: apague
-- quando tiver o produto de verdade (instruções no fim do arquivo).
--
-- Reexecutável: se rodar duas vezes, não duplica (ON CONFLICT).
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.catalog_products') IS NULL THEN
    RAISE EXCEPTION 'Aplique APLICAR-EM-PRODUCAO.sql antes: catalog_products não existe.';
  END IF;
END $$;

-- 1) Produto, já validado (é o que libera o vendedor a usar).
INSERT INTO public.catalog_products
  (code, name, family, description, base_price, min_qty, grade, status, validated_at)
VALUES
  ('DEMO-CAM-FUT-2026', 'Camisa futebol (DEMO)', 'Uniformes esportivos',
   'Produto de demonstração criado para teste do fluxo de pedido. Apague quando houver produto real.',
   97.77, 10, '["P","M","G","GG","3G"]'::jsonb, 'validado', now())
ON CONFLICT (code) DO NOTHING;

-- 2) Grupos de opção.
INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT p.id, 'producao', 'Produção', 'multi', false, 1
  FROM public.catalog_products p WHERE p.code = 'DEMO-CAM-FUT-2026'
ON CONFLICT (product_id, code) DO NOTHING;

INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT p.id, 'personalizacao', 'Personalização', 'multi', true, 2
  FROM public.catalog_products p WHERE p.code = 'DEMO-CAM-FUT-2026'
ON CONFLICT (product_id, code) DO NOTHING;

INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT p.id, 'gola', 'Gola', 'single', true, 3
  FROM public.catalog_products p WHERE p.code = 'DEMO-CAM-FUT-2026'
ON CONFLICT (product_id, code) DO NOTHING;

-- 3) Operações/opções que carregam custeio.
--    driver: 'peca' (por peça), 'minuto' (por minuto de costura),
--            'mil_pontos' (bordado, por mil pontos).
INSERT INTO public.catalog_options
  (group_id, code, name, sector, operation_name, driver, unit_cost, setup_cost,
   outsourced, price_delta, material_consumption)
SELECT g.id, v.code, v.name, v.sector, v.operation, v.driver,
       v.unit_cost, v.setup_cost, v.outsourced, 0, '[]'::jsonb
  FROM public.catalog_option_groups g
  JOIN public.catalog_products p ON p.id = g.product_id
  JOIN (VALUES
    ('producao',      'corte',       'Corte',              'Corte',        'Corte',               'peca',        2.40,  0.00, false),
    ('producao',      'costura',     'Costura reta',       'Costura',      'Costura reta',        'minuto',      0.55,  0.00, false),
    ('producao',      'acabamento',  'Acabamento',         'Acabamento',   'Acabamento',          'peca',        2.80,  0.00, false),
    ('personalizacao','bordado',     'Bordado escudo',     'Bordado',      'Bordado escudo',      'mil_pontos',  0.11, 38.00, true),
    ('personalizacao','sublimacao',  'Sublimação total',   'Sublimação',   'Sublimação total',    'peca',        8.00,  0.00, true),
    ('gola',          'gola-careca', 'Gola careca',        'Costura',      'Gola careca',         'peca',        1.10,  0.00, false),
    ('gola',          'gola-polo',   'Gola polo',          'Costura',      'Gola polo',           'peca',        2.30,  0.00, false)
  ) AS v(group_code, code, name, sector, operation, driver, unit_cost, setup_cost, outsourced)
    ON v.group_code = g.code
   AND p.code = 'DEMO-CAM-FUT-2026'
ON CONFLICT (group_id, code) DO NOTHING;

-- 4) Conferência: deve dar 1 produto, 3 grupos e 7 opções.
SELECT p.code, p.status, p.min_qty,
       (SELECT count(*) FROM public.catalog_option_groups g WHERE g.product_id = p.id) AS grupos,
       (SELECT count(*) FROM public.catalog_options o
          JOIN public.catalog_option_groups g2 ON g2.id = o.group_id
         WHERE g2.product_id = p.id)                                                  AS opcoes
  FROM public.catalog_products p
 WHERE p.code = 'DEMO-CAM-FUT-2026';

-- ---------------------------------------------------------------------------
-- Para apagar o produto de demonstração depois (os grupos e opções caem junto):
-- DELETE FROM public.catalog_products WHERE code = 'DEMO-CAM-FUT-2026';
-- ---------------------------------------------------------------------------
