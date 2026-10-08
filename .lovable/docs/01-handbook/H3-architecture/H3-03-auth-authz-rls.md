# H3-03 · Autenticação, autorização e RLS

Três camadas ortogonais. Confundir gera privilege escalation.

## Autenticação (quem é você)

Supabase Auth. Sessão em `localStorage` no browser, bearer token no header
para server fns. Rotas protegidas ficam sob `src/routes/_authenticated/`.

## Autorização (o que você pode fazer)

Roles em tabela **separada** (`user_roles`) — nunca em `profiles`.
Enum `app_role`: valores atuais em `src/integrations/supabase/types.ts`.

Checagem sempre via `public.has_role(auth.uid(), 'admin')` — nunca comparar
role em coluna nem confiar em campo do cliente.

## RLS (o que a linha permite ler/escrever)

Toda tabela pública com RLS ativada. Padrão em H2-03.

- SELECT: `is_member(auth.uid())` para dados do time; owner para privado
- INSERT: `WITH CHECK (auth.uid() = created_by)`
- UPDATE: owner OR admin, com `WITH CHECK` em `updated_by`
- DELETE: admin, ou nunca (arquivar)

## Anti-padrões

- `SELECT ... TO anon` em tabela com dado de negócio.
- Policy `FOR ALL USING (true)`.
- Checar role no cliente (`if (user.role === 'admin')`).
- Middleware de auth em rota SSR pública (loop de redirect).
- Recriar gate em cada rota filha em vez de usar `_authenticated/`.

## Server-side

- Leitura como usuário: `requireSupabaseAuth` (RLS aplicada).
- Leitura pública read-only: cliente publishable server-side + policy `TO anon`.
- Ações administrativas verificadas: `supabaseAdmin` (bypass RLS) **após**
  checar `has_role` do caller.
