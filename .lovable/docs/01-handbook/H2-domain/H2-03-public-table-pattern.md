# H2-03 · Padrão de tabela pública (RLS + GRANT)

Template obrigatório para toda nova tabela em `public`. Copie, adapte, revise.

```sql
-- 1. TABELA
CREATE TABLE public.<name> (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- colunas de domínio aqui...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users
);

-- 2. GRANTS (nunca esquecer service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;
GRANT ALL ON public.<name> TO service_role;
-- GRANT SELECT ON public.<name> TO anon;  -- apenas se há política pública explícita

-- 3. RLS
ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (uma por ação, sem "FOR ALL" genérico)
CREATE POLICY "<name>_select_members"
  ON public.<name> FOR SELECT
  TO authenticated
  USING (public.is_member(auth.uid()));

CREATE POLICY "<name>_insert_members"
  ON public.<name> FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "<name>_update_owner_or_admin"
  ON public.<name> FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = updated_by);

CREATE POLICY "<name>_delete_admin_only"
  ON public.<name> FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. UPDATED_AT
CREATE TRIGGER <name>_updated_at
  BEFORE UPDATE ON public.<name>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ÍNDICES (todas as FKs e colunas filtradas)
CREATE INDEX <name>_created_by_idx ON public.<name>(created_by);
-- + FKs específicas do domínio

-- 7. COMENTÁRIOS (contexto para IA + humanos)
COMMENT ON TABLE public.<name> IS
  '<propósito de negócio em uma frase>';
COMMENT ON COLUMN public.<name>.<coluna_de_negocio> IS
  '<regra de negócio, não repetir o nome>';
```

## Anti-padrões

- `GRANT SELECT ON public.<name> TO anon` sem política pública explícita.
- `CREATE POLICY ... FOR ALL USING (true)`.
- Esquecer `WITH CHECK` no INSERT/UPDATE.
- RLS habilitada sem nenhuma policy = tabela **travada** (ninguém lê).
- Policy usando role via coluna (`WHERE role = 'admin'`) em vez de `has_role()`.
