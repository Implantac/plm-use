-- =============================================================================
-- ACESSO TOTAL A UM USUÁRIO — revisão + concessão
--
-- Alvo: etcsuporte889@gmail.com
--
-- O sistema NÃO tem um papel "superadmin". O topo é `admin`, e ele é suficiente
-- para todas as telas e recursos: todas as funções de permissão (can_sell,
-- can_cost, can_plan_pcp, can_write_pcp) e as 77 políticas RLS que citam papel
-- incluem `admin`. Não existe gate que exclua admin.
--
-- Este script:
--   1) REVISA  — mostra o usuário, o perfil e os papéis de hoje
--   2) CONCEDE — insere o papel `admin` (idempotente)
--   3) PROVA   — avalia cada função de permissão com o UUID dele
--   4) DETALHA — lista as 16 telas/recursos e o que cada um exige
--
-- Não apaga nada. Rodar duas vezes não duplica (ON CONFLICT DO NOTHING).
-- Não precisa de nada além do SQL editor do Lovable Cloud.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) REVISÃO — quem é esse usuário hoje
-- ---------------------------------------------------------------------------
-- >>> === 1. USUARIO, CONTA E PERFIL === <<<

SELECT u.email,
       u.id                                   AS user_id,
       u.created_at                           AS conta_criada,
       (u.email_confirmed_at IS NOT NULL)     AS email_confirmado,
       u.last_sign_in_at                      AS ultimo_acesso,
       (p.id IS NOT NULL)                     AS tem_perfil,
       p.full_name,
       p.job_title,
       COALESCE((SELECT string_agg(r.role::text, ', ' ORDER BY r.role::text)
                   FROM public.user_roles r WHERE r.user_id = u.id), '(nenhum)') AS papeis_hoje
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com');

-- >>> === 2. O USUARIO EXISTE? === <<<

DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower('etcsuporte889@gmail.com');

  IF v_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário etcsuporte889@gmail.com NÃO existe em auth.users. Peça para a pessoa criar a conta em https://plmuse.lovable.app/login (e confirmar o e-mail) e rode este script de novo. Nada foi alterado.';
  END IF;

  RAISE NOTICE 'Usuário encontrado: % (%). Seguindo para a concessão.', v_id, 'etcsuporte889@gmail.com';
END $$;

-- ---------------------------------------------------------------------------
-- 3) CONCESSÃO — papel admin (o topo do sistema)
-- ---------------------------------------------------------------------------
-- >>> === 3. CONCEDENDO ADMIN === <<<

-- 3.0 Permissão de escrita em user_roles.
--     Defeito encontrado em 21/10/2026: `authenticated` só tinha SELECT nessa
--     tabela. A política RLS já limitava a escrita a admin, mas sem o GRANT o
--     INSERT falhava antes da política — então NEM ADMIN conseguia conceder
--     papel pela tela /admin/users ("permission denied for table user_roles").
--     O GRANT abre a operação; a política continua decidindo quem escreve.
--     Mesmo conteúdo de supabase/migrations/20261021120000_user_roles_grants.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 3.1 Garante a linha em profiles (o trigger handle_new_user cria no cadastro;
--     isto cobre usuário criado antes do trigger existir).
INSERT INTO public.profiles (id)
SELECT u.id FROM auth.users u
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- 3.2 O papel.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
  FROM auth.users u
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- >>> === 4. PAPEIS DEPOIS DA CONCESSAO === <<<

SELECT r.role::text AS papel, r.created_at
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com')
 ORDER BY r.role::text;

-- ---------------------------------------------------------------------------
-- 5) PROVA — cada gate de permissão avaliado para ESTE usuário
-- ---------------------------------------------------------------------------
-- >>> === 5. GATES DE PERMISSAO (todos devem ser true) === <<<

SELECT u.email,
       public.has_role(u.id, 'admin')                AS admin,
       public.is_member(u.id)                        AS membro,
       public.can_sell(u.id)                         AS pode_vender,
       public.can_cost(u.id)                         AS pode_custear,
       public.can_write_pcp(u.id)                    AS pode_apontar_pcp,
       public.can_plan_pcp(u.id)                     AS pode_planejar_pcp
  FROM auth.users u
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com');

-- ---------------------------------------------------------------------------
-- 6) DETALHE — o que cada papel admin destrava
-- ---------------------------------------------------------------------------
-- >>> === 6. TELAS E O QUE ELAS EXIGEM === <<<

SELECT t.recurso,
       t.exigencia,
       CASE
         WHEN t.exigencia = 'admin'    THEN public.has_role(u.id, 'admin')
         WHEN t.exigencia = 'venda'    THEN public.can_sell(u.id)
         WHEN t.exigencia = 'custo'    THEN public.can_cost(u.id)
         WHEN t.exigencia = 'pcp'      THEN public.can_plan_pcp(u.id)
         WHEN t.exigencia = 'pcp-escrita' THEN public.can_write_pcp(u.id)
         ELSE public.is_member(u.id)
       END AS liberado
  FROM auth.users u
  CROSS JOIN (VALUES
    ('/orders — emitir pedido',                     'venda'),
    ('/orders — enviar para custo',                 'venda'),
    ('/catalog — validar produto',                  'custo'),
    ('/orders — recalcular e aprovar custo',        'custo'),
    ('/orders — liberar para PCP',                  'pcp'),
    ('/planner — programar lote',                   'pcp'),
    ('/production — apontar passagem',              'pcp-escrita'),
    ('/production/today',                           'pcp-escrita'),
    ('/admin/users — conceder papéis',              'admin'),
    ('/approvals, /audit, /security',               'admin'),
    ('/dashboard, /collections, /development, /cad', 'membro'),
    ('/suppliers, /materials, /inventory',          'membro'),
    ('/quality, /tech-sheet, /pieces-report',       'membro'),
    ('/analytics, /financial, /flow',               'membro')
  ) AS t(recurso, exigencia)
 WHERE lower(u.email) = lower('etcsuporte889@gmail.com')
 ORDER BY liberado, t.recurso;

-- =============================================================================
-- ROLLBACK — revogar o acesso total, se precisar
-- =============================================================================
-- DELETE FROM public.user_roles
--  WHERE role = 'admin'
--    AND user_id = (SELECT id FROM auth.users
--                    WHERE lower(email) = lower('etcsuporte889@gmail.com'));
--
-- ATENÇÃO: se este for o único admin do sistema, ao revogar ninguém conseguirá
-- conceder papéis nem pela tela /admin/users. Mantenha ao menos um admin.
-- =============================================================================
