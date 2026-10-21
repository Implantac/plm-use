-- Permite que um ADMIN gerencie papéis pela tela /admin/users.
--
-- Defeito encontrado em 21/10/2026: `user_roles` só tinha GRANT SELECT para
-- `authenticated`. A política RLS "Only admin manages roles" já restringia a
-- escrita a quem tem papel admin, mas sem o GRANT o INSERT/DELETE falhava antes
-- de a política ser avaliada — com "permission denied for table user_roles".
-- Resultado prático: nem o admin conseguia conceder papel pela interface, e
-- todo papel novo virava tarefa de DBA.
--
-- GRANT e RLS são camadas diferentes: o GRANT abre a operação para o papel
-- `authenticated`; a política decide QUEM, dentro dele, pode escrever. Como a
-- política exige public.has_role(auth.uid(),'admin'), conceder escrita aqui não
-- cria escalada de privilégio: usuário comum continua recebendo 0 linhas e
-- nenhuma escrita.
--
-- Idempotente: GRANT repetido não tem efeito colateral.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Ler o próprio perfil já é permitido desde a migration original; o admin
-- também lê todos (política "Users update own profile" cobre a leitura).
