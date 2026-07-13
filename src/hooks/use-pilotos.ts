// V5 · Hook de leitura/criação para a entidade Piloto.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Piloto {
  id: string;
  reference_id: string;
  tech_sheet_id: string | null;
  supplier_id: string | null;
  tipo: string;
  rodada: number;
  status: string;
  observacoes: string | null;
  foto_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePilotos(referenceId?: string) {
  const [items, setItems] = useState<Piloto[]>([]);
  const [loading, setLoading] = useState(true);

  const sortItems = (arr: Piloto[]) =>
    [...arr].sort(
      (a, b) =>
        b.rodada - a.rodada ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("pilotos" as never)
        .select("*")
        .order("rodada", { ascending: false })
        .order("created_at", { ascending: false });
      if (referenceId) q = q.eq("reference_id", referenceId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      setItems((data as Piloto[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  /** Insere/atualiza um piloto localmente (otimista) sem esperar o refetch. */
  const upsertLocal = useCallback((p: Piloto) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== p.id);
      next.push(p);
      return sortItems(next);
    });
  }, []);

  /** Remove um piloto do estado local (rollback otimista). */
  const removeLocal = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { items, loading, refetch: fetch, upsertLocal, removeLocal };
}

export function useCreatePiloto() {
  const { user } = useAuth();

  const create = useCallback(
    async (input: {
      reference_id: string;
      tech_sheet_id?: string | null;
      supplier_id?: string | null;
      tipo?: string;
      rodada?: number;
      status?: string;
      observacoes?: string | null;
    }): Promise<Piloto | null> => {
      if (!user) return null;

      // Próxima rodada automática se não informada
      let rodada = input.rodada;
      if (!rodada) {
        const { data: last } = await supabase
          .from("pilotos" as never)
          .select("rodada")
          .eq("reference_id", input.reference_id)
          .order("rodada", { ascending: false })
          .limit(1)
          .maybeSingle();
        rodada = ((last as { rodada?: number } | null)?.rodada ?? 0) + 1;
      }

      const { data, error } = await supabase
        .from("pilotos" as never)
        .insert({
          reference_id: input.reference_id,
          tech_sheet_id: input.tech_sheet_id ?? null,
          supplier_id: input.supplier_id ?? null,
          tipo: input.tipo ?? "prova",
          rodada,
          status: input.status ?? "RASCUNHO",
          observacoes: input.observacoes ?? null,
          created_by: user.id,
          updated_by: user.id,
        } as never)
        .select("*")
        .single();
      if (error) return null;
      return data as Piloto;
    },
    [user],
  );


  return { create };
}
