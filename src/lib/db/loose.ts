// Cliente Supabase sem os tipos gerados.
//
// `src/integrations/supabase/types.ts` é gerado a partir do banco e ainda não
// conhece as tabelas do fluxo de pedido/PCP criadas em 21/10/2026 (o comando é
// `supabase gen types typescript --local > src/integrations/supabase/types.ts`,
// que precisa do projeto Supabase). Até lá, quem consulta essas tabelas passa por
// aqui — mesmo padrão já usado em `src/lib/sales/api.ts` e `creative-sync.ts`.
import { supabase } from "@/integrations/supabase/client";

export type Row = Record<string, unknown>;
export type LooseError = { message: string; code?: string };
export type LooseResult<T = Row[]> = { data: T | null; error: LooseError | null };

export type LooseQuery = Promise<LooseResult> & {
  select(cols?: string): LooseQuery;
  eq(col: string, val: unknown): LooseQuery;
  neq(col: string, val: unknown): LooseQuery;
  in(col: string, vals: unknown[]): LooseQuery;
  not(col: string, op: string, val: unknown): LooseQuery;
  order(col: string, opts?: { ascending?: boolean }): LooseQuery;
  limit(n: number): LooseQuery;
  maybeSingle(): Promise<LooseResult<Row>>;
  single(): Promise<LooseResult<Row>>;
  insert(rows: unknown): LooseQuery;
  update(row: unknown): LooseQuery;
  upsert(rows: unknown, opts?: { onConflict?: string }): LooseQuery;
  delete(): LooseQuery;
};

export type LooseClient = {
  from(table: string): LooseQuery;
  rpc(fn: string, args?: Record<string, unknown>): Promise<LooseResult<unknown>>;
};

export const looseDb = supabase as unknown as LooseClient;
