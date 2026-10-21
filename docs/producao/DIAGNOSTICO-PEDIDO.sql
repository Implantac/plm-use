-- =============================================================================
-- DIAGNÓSTICO DA EMISSÃO DE PEDIDO — rode no SQL editor e leia o resultado.
--
-- Serve ANTES e DEPOIS de aplicar APLICAR-EM-PRODUCAO.sql: não depende de as
-- tabelas existirem (usa to_regclass), não cria nada e não altera nada.
--
-- Como ler: "existe = false" ou "0" nas tabelas do pedido = o fluxo não pode
-- funcionar (é exatamente o sintoma "não encontro as opções de emissão").
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) As 13 tabelas do fluxo existem? Quantos registros têm?
-- ---------------------------------------------------------------------------
SELECT t.nome                                        AS tabela,
       (to_regclass('public.' || t.nome) IS NOT NULL) AS existe,
       CASE
         WHEN to_regclass('public.' || t.nome) IS NULL THEN '—'
         ELSE (xpath('/row/cnt/text()',
                     query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', t.nome),
                                  false, true, '')))[1]::text
       END                                           AS registros
  FROM unnest(ARRAY['materials', 'customers', 'catalog_products',
                    'catalog_option_groups', 'catalog_options',
                    'sales_orders', 'sales_order_items', 'sales_order_item_sizes',
                    'sales_order_item_options', 'sales_order_item_materials',
                    'sales_order_item_operations', 'sales_order_item_costs',
                    'cost_settings']) AS t(nome);

-- ---------------------------------------------------------------------------
-- 2) As 8 funções do fluxo existem?
-- ---------------------------------------------------------------------------
SELECT f.nome AS funcao,
       EXISTS (SELECT 1
                 FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = f.nome) AS existe
  FROM unnest(ARRAY['next_sales_order_number', 'submit_sales_order',
                    'recalc_sales_order_item', 'approve_sales_order_item',
                    'release_sales_order_to_pcp', 'order_item_technical_sheet',
                    'can_sell', 'can_cost']) AS f(nome);

-- ---------------------------------------------------------------------------
-- 3) Quem pode EMITIR pedido? (papéis comerciais)
--    Sem papel na lista, o botão "+ Novo pedido" NÃO aparece na tela.
-- ---------------------------------------------------------------------------
SELECT u.email,
       COALESCE(string_agg(r.role::text, ', ' ORDER BY r.role::text), '(sem papel)') AS papeis,
       bool_or(r.role::text IN ('admin', 'manager', 'comercial', 'diretor_produto')) AS pode_emitir,
       bool_or(r.role::text IN ('admin', 'manager', 'engenharia_custo',
                                'coordenador_produto'))                                AS pode_custear
  FROM auth.users u
  LEFT JOIN public.user_roles r ON r.user_id = u.id
 GROUP BY u.email
 ORDER BY pode_emitir DESC NULLS LAST, u.email;

-- ---------------------------------------------------------------------------
-- 4) Conceder o papel que falta (ajuste o e-mail)
--    Descomente as 3 linhas, troque o e-mail e execute.
-- ---------------------------------------------------------------------------
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'comercial' FROM auth.users WHERE email = 'seu.email@empresa.com'
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'engenharia_custo' FROM auth.users WHERE email = 'custo@empresa.com'
-- ON CONFLICT DO NOTHING;
