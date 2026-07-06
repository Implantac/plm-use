// Núcleo do PLM — Referência unificada com máquina de estados e realtime.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type ReferenceStatus = Database["public"]["Enums"]["reference_status"];
export type ReferencePriority = Database["public"]["Enums"]["reference_priority"];
export type ReferenceRow = Database["public"]["Tables"]["references"]["Row"];
export type ReferenceInsert = Database["public"]["Tables"]["references"]["Insert"];
export type ReferenceUpdate = Database["public"]["Tables"]["references"]["Update"];

export const REFERENCE_STATUSES: ReferenceStatus[] = [
  "IDEIA",
  "CROQUI",
  "MODELAGEM",
  "PILOTO",
  "AJUSTE",
  "APROVACAO",
  "ENGENHARIA",
  "PRODUCAO",
  "FINALIZADA",
  "ARQUIVADA",
];

export const REFERENCE_PRIORITIES: ReferencePriority[] = [
  "BAIXA",
  "MEDIA",
  "ALTA",
  "URGENTE",
];

export const REFERENCE_STATUS_LABEL: Record<ReferenceStatus, string> = {
  IDEIA: "Ideia",
  CROQUI: "Croqui",
  MODELAGEM: "Modelagem",
  PILOTO: "Piloto",
  AJUSTE: "Ajuste",
  APROVACAO: "Aprovação",
  ENGENHARIA: "Engenharia",
  PRODUCAO: "Produção",
  FINALIZADA: "Finalizada",
  ARQUIVADA: "Arquivada",
};

type TransitionRow = Database["public"]["Tables"]["reference_transitions"]["Row"];

export function useReferences() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReferenceRow[]>([]);
  const [transitions, setTransitions] = useState<TransitionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("references").select("*").order("created_at", { ascending: false }),
      supabase.from("reference_transitions").select("*").eq("is_active", true),
    ]).then(([refs, trs]) => {
      if (cancelled) return;
      if (refs.data) setItems(refs.data as ReferenceRow[]);
      if (trs.data) setTransitions(trs.data as TransitionRow[]);
      setLoading(false);
    });

    const ch = supabase
      .channel("references-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "references" },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ReferenceRow;
              return prev.some((p) => p.id === row.id) ? prev : [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as ReferenceRow;
              return prev.map((p) => (p.id === row.id ? row : p));
            }
            if (payload.eventType === "DELETE") {
              const o = payload.old as { id: string };
              return prev.filter((p) => p.id !== o.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  const transitionsMap = useMemo(() => {
    const m = new Map<ReferenceStatus, ReferenceStatus[]>();
    for (const t of transitions) {
      const arr = m.get(t.from_status) ?? [];
      arr.push(t.to_status);
      m.set(t.from_status, arr);
    }
    return m;
  }, [transitions]);

  const nextStatuses = useCallback(
    (from: ReferenceStatus) => transitionsMap.get(from) ?? [],
    [transitionsMap],
  );

  const canTransition = useCallback(
    (from: ReferenceStatus, to: ReferenceStatus) =>
      (transitionsMap.get(from) ?? []).includes(to),
    [transitionsMap],
  );

  const create = useCallback(
    async (
      input: Omit<ReferenceInsert, "created_by" | "updated_by" | "id">,
    ): Promise<ReferenceRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("references")
        .insert({ ...input, created_by: user.id, updated_by: user.id })
        .select()
        .single();
      if (error || !data) return null;
      return data as ReferenceRow;
    },
    [user],
  );

  const update = useCallback(
    async (id: string, patch: ReferenceUpdate) => {
      if (!user) return false;
      const { error } = await supabase
        .from("references")
        .update({ ...patch, updated_by: user.id })
        .eq("id", id);
      return !error;
    },
    [user],
  );

  const transition = useCallback(
    async (ref: ReferenceRow, to: ReferenceStatus, note?: string) => {
      if (!canTransition(ref.status, to)) return false;
      const ok = await update(ref.id, { status: to });
      if (!ok) return false;

      // Registra evento de negócio (adicional ao trigger de status_change)
      if (user) {
        await supabase.from("entity_events").insert({
          entity_type: "reference",
          entity_id: ref.id,
          event_type: "workflow_transition",
          from_status: ref.status,
          to_status: to,
          note: note ?? null,
          actor: user.id,
          actor_name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email ??
            null,
          payload: { code: ref.code } as never,
        });
      }

      // Workflow automático: APROVACAO → ENGENHARIA (piloto aprovado abre engenharia)
      if (to === "APROVACAO" && (transitionsMap.get("APROVACAO") ?? []).includes("ENGENHARIA")) {
        await update(ref.id, { status: "ENGENHARIA" });
        if (user) {
          await supabase.from("entity_events").insert({
            entity_type: "reference",
            entity_id: ref.id,
            event_type: "auto_workflow",
            from_status: "APROVACAO",
            to_status: "ENGENHARIA",
            note: "Piloto aprovado — engenharia aberta automaticamente",
            actor: user.id,
            actor_name: null,
            payload: { rule: "aprovacao_to_engenharia" } as never,
          });
        }
      }
      return true;
    },
    [canTransition, update, transitionsMap, user],
  );

  const upsertByCode = useCallback(
    async (
      input: Omit<ReferenceInsert, "created_by" | "updated_by" | "id"> & {
        code: string;
      },
    ) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("references")
        .upsert(
          { ...input, created_by: user.id, updated_by: user.id },
          { onConflict: "code" },
        )
        .select()
        .single();
      if (error || !data) return null;
      return data as ReferenceRow;
    },
    [user],
  );

  return {
    items,
    loading,
    transitions,
    nextStatuses,
    canTransition,
    create,
    update,
    transition,
    upsertByCode,
  };
}
