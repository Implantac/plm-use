-- Concede o nivel maximo do PLM (o papel admin, que e o "superadmin" do app:
-- enum app_role nao tem tier acima, e o RLS ja trata has_role(uid,'admin')
-- como acesso total) ao usuario etcsuporte889@gmail.com.
--
-- COMO EXECUTAR: Lovable -> More -> Database -> Manage -> SQL editor, colar e
-- rodar com Ctrl+Enter. PRE-REQUISITO: o usuario precisa ter logado pelo
-- menos 1 vez no app publicado (botao Google ou cadastro), porque a linha dele
-- em auth.users nasce no primeiro login. Idempotente: rodar 2x nao duplica.
WITH alvo AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('etcsuporte889@gmail.com')
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM alvo
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = alvo.id
    AND ur.role = 'admin'
);

-- Prova do resultado: deve listar etcsuporte889@gmail.com com 'admin' entre as
-- roles. Se vier 0 linhas, o usuario ainda nao logou no app - faca-o logar e
-- rode este arquivo de novo.
SELECT u.email,
       coalesce(
         string_agg(ur.role::text, ',' ORDER BY ur.role::text),
         'SEM ROLE AINDA'
       ) AS roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE lower(u.email) = lower('etcsuporte889@gmail.com')
GROUP BY u.email;
