// Núcleo do PLM — Referência unificada com máquina de estados e realtime.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { descreverErroSupabase, motivoDe } from "@/lib/supabase/erro-humano";
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

export const REFERENCE_PRIORITIES: ReferencePriority[] = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

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

export type ResultadoGravacao = { ok: true } | { ok: false; reason: string };

export function useReferences() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReferenceRow[]>([]);
  const [transitions, setTransitions] = useState<TransitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("references").select("*").order("created_at", { ascending: false }),
      supabase.from("reference_transitions").select("*").eq("is_active", true),
    ])
      .then(([refs, trs]) => {
        if (cancelled) return;
        if (refs.error) {
          setError(descreverErroSupabase(refs.error, "carregar as referências"));
        } else {
          setItems(refs.data ?? []);
          setError(null);
        }
        if (trs.data) setTransitions(trs.data as TransitionRow[]);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(motivoDe(cause, "carregar as referências"));
        setLoading(false);
      });

    const ch = supabase
      .channel(`references-live-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "references" }, (payload) => {
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
      })
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
    (from: ReferenceStatus, to: ReferenceStatus) => (transitionsMap.get(from) ?? []).includes(to),
    [transitionsMap],
  );

  const create = useCallback(
    async (
      input: Omit<ReferenceInsert, "created_by" | "updated_by" | "id">,
    ): Promise<ReferenceRow | null> => {
      if (!user) {
        toast.error("Não foi possível criar a referência: você não está autenticado.");
        return null;
      }
      const { data, error } = await supabase
        .from("references")
        .insert({ ...input, created_by: user.id, updated_by: user.id })
        .select()
        .single();
      if (error || !data) {
        // Onda 81: o porquê vem do erro real (permissão, sessão, duplicidade…),
        // nunca de um texto genérico. Único toast — os chamadores não repetem.
        toast.error(descreverErroSupabase(error, "criar a referência"));
        return null;
      }
      return data as ReferenceRow;
    },
    [user],
  );

  // Onda 99: gravação nunca falha em silêncio — quem chama recebe o motivo real
  // (permissão, sessão, regra do banco) e o mostra num único toast.
  const update = useCallback(
    async (id: string, patch: ReferenceUpdate): Promise<ResultadoGravacao> => {
      if (!user) {
        return {
          ok: false,
          reason: "Não foi possível salvar a referência: você não está autenticado.",
        };
      }
      const { error } = await supabase
        .from("references")
        .update({ ...patch, updated_by: user.id })
        .eq("id", id);
      if (error) return { ok: false, reason: descreverErroSupabase(error, "salvar a referência") };
      return { ok: true };
    },
    [user],
  );

  const transition = useCallback(
    async (ref: ReferenceRow, to: ReferenceStatus, note?: string): Promise<ResultadoGravacao> => {
      if (!canTransition(ref.status, to)) {
        return {
          ok: false,
          reason: `A transição de ${REFERENCE_STATUS_LABEL[ref.status]} para ${REFERENCE_STATUS_LABEL[to]} não é permitida pelo fluxo.`,
        };
      }
      const salvo = await update(ref.id, { status: to });
      if (!salvo.ok) return salvo;

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
          actor_name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
          payload: { code: ref.code } as never,
        });
      }

      // Workflow automático: APROVACAO → ENGENHARIA (piloto aprovado abre engenharia)
      if (to === "APROVACAO" && (transitionsMap.get("APROVACAO") ?? []).includes("ENGENHARIA")) {
        const auto = await update(ref.id, { status: "ENGENHARIA" });
        if (!auto.ok) {
          toast.warning(
            `Piloto aprovado, mas a engenharia não foi aberta automaticamente. ${auto.reason}`,
          );
        }
        if (auto.ok && user) {
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
      return { ok: true };
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
        .upsert({ ...input, created_by: user.id, updated_by: user.id }, { onConflict: "code" })
        .select()
        .single();
      if (error || !data) {
        toast.error(descreverErroSupabase(error, "salvar a referência"));
        return null;
      }
      return data as ReferenceRow;
    },
    [user],
  );

  return {
    items,
    loading,
    error,
    transitions,
    nextStatuses,
    canTransition,
    create,
    update,
    transition,
    upsertByCode,
  };
}
