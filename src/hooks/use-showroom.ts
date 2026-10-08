// H9-09 · Mostruário — hook único para samples, kits, publicações,
// feedback e decisões de lançamento. Segue o padrão de use-references:
// carga inicial + realtime + ações via supabase respeitando RLS.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type ShowroomSampleRow = Database["public"]["Tables"]["showroom_sample"]["Row"];
export type ShowroomSampleInsert = Database["public"]["Tables"]["showroom_sample"]["Insert"];
export type ShowroomKitRow = Database["public"]["Tables"]["showroom_kit"]["Row"];
export type ShowroomKitItemRow = Database["public"]["Tables"]["showroom_kit_item"]["Row"];
export type ShowroomPublicationRow = Database["public"]["Tables"]["showroom_publication"]["Row"];
export type ShowroomFeedbackRow = Database["public"]["Tables"]["showroom_feedback"]["Row"];
export type ShowroomFeedbackInsert = Database["public"]["Tables"]["showroom_feedback"]["Insert"];
export type ShowroomDecisionRow = Database["public"]["Tables"]["showroom_decision"]["Row"];

export type ShowroomSampleStatus =
  | "solicitada"
  | "recebida"
  | "em_curadoria"
  | "aprovada"
  | "reprovada"
  | "em_kit"
  | "em_showroom"
  | "retornada"
  | "devolvida"
  | "arquivada";

export type ShowroomPublicationStatus =
  "rascunho" | "em_revisao" | "publicada" | "rejeitada" | "congelada";

export type ShowroomDecision = "pendente" | "go" | "no_go" | "revisar";

export type ShowroomFeedbackDimension =
  "caimento" | "cor" | "tato" | "medida" | "preco_percebido" | "storytelling";

export const SAMPLE_STATUS_LABEL: Record<ShowroomSampleStatus, string> = {
  solicitada: "Solicitada",
  recebida: "Recebida",
  em_curadoria: "Em curadoria",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
  em_kit: "Em kit",
  em_showroom: "Em showroom",
  retornada: "Retornada",
  devolvida: "Devolvida",
  arquivada: "Arquivada",
};

export const PUBLICATION_STATUS_LABEL: Record<ShowroomPublicationStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  publicada: "Publicada",
  rejeitada: "Rejeitada",
  congelada: "Congelada",
};

export const DECISION_LABEL: Record<ShowroomDecision, string> = {
  pendente: "Pendente",
  go: "Go — lançar",
  no_go: "No-Go — não lançar",
  revisar: "Revisar antes de lançar",
};

export const FEEDBACK_DIMENSIONS: ShowroomFeedbackDimension[] = [
  "caimento",
  "cor",
  "tato",
  "medida",
  "preco_percebido",
  "storytelling",
];

export function useShowroom() {
  const { user } = useAuth();
  const [samples, setSamples] = useState<ShowroomSampleRow[]>([]);
  const [kits, setKits] = useState<ShowroomKitRow[]>([]);
  const [publications, setPublications] = useState<ShowroomPublicationRow[]>([]);
  const [feedback, setFeedback] = useState<ShowroomFeedbackRow[]>([]);
  const [decisions, setDecisions] = useState<ShowroomDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("showroom_sample").select("*").order("created_at", { ascending: false }),
      supabase.from("showroom_kit").select("*").order("created_at", { ascending: false }),
      supabase.from("showroom_publication").select("*").order("created_at", { ascending: false }),
      supabase
        .from("showroom_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("showroom_decision").select("*").order("created_at", { ascending: false }),
    ]).then(([s, k, p, f, d]) => {
      if (cancelled) return;
      if (s.data) setSamples(s.data as ShowroomSampleRow[]);
      if (k.data) setKits(k.data as ShowroomKitRow[]);
      if (p.data) setPublications(p.data as ShowroomPublicationRow[]);
      if (f.data) setFeedback(f.data as ShowroomFeedbackRow[]);
      if (d.data) setDecisions(d.data as ShowroomDecisionRow[]);
      setLoading(false);
    });

    const ch = supabase
      .channel(`showroom-live-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "showroom_sample" },
        (payload) => {
          setSamples((prev) => mergeRow(prev, payload));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "showroom_publication" },
        (payload) => {
          setPublications((prev) => mergeRow(prev, payload));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "showroom_feedback" },
        (payload) => {
          setFeedback((prev) => mergeRow(prev, payload));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "showroom_decision" },
        (payload) => {
          setDecisions((prev) => mergeRow(prev, payload));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  const feedbackByReference = useMemo(() => {
    const m = new Map<string, ShowroomFeedbackRow[]>();
    for (const f of feedback) {
      const arr = m.get(f.reference_id) ?? [];
      arr.push(f);
      m.set(f.reference_id, arr);
    }
    return m;
  }, [feedback]);

  const requestSample = useCallback(
    async (input: Omit<ShowroomSampleInsert, "id" | "created_by" | "updated_by">) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("showroom_sample")
        .insert({ ...input, created_by: user.id, updated_by: user.id })
        .select()
        .single();
      if (error || !data) return null;
      return data as ShowroomSampleRow;
    },
    [user],
  );

  const transitionSample = useCallback(
    async (id: string, to: ShowroomSampleStatus, motivo?: string) => {
      if (!user) return false;
      const patch: Partial<ShowroomSampleRow> = { status: to, updated_by: user.id };
      if (motivo) patch.motivo = motivo;
      const { error } = await supabase.from("showroom_sample").update(patch).eq("id", id);
      return !error;
    },
    [user],
  );

  const captureFeedback = useCallback(
    async (input: Omit<ShowroomFeedbackInsert, "id" | "autor_id">) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("showroom_feedback")
        .insert({
          ...input,
          autor_id: user.id,
          autor_nome: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? null,
        })
        .select()
        .single();
      if (error || !data) return null;
      return data as ShowroomFeedbackRow;
    },
    [user],
  );

  const recordDecision = useCallback(
    async (
      reference_id: string,
      decision: Exclude<ShowroomDecision, "pendente">,
      justificativa: string,
      publication_id?: string | null,
    ) => {
      if (!user) return false;
      const { error } = await supabase.from("showroom_decision").upsert(
        {
          reference_id,
          publication_id: publication_id ?? null,
          decision,
          justificativa,
          decidido_por: user.id,
          created_by: user.id,
          updated_by: user.id,
        },
        { onConflict: "reference_id,publication_id" },
      );
      return !error;
    },
    [user],
  );

  return {
    samples,
    kits,
    publications,
    feedback,
    decisions,
    feedbackByReference,
    loading,
    requestSample,
    transitionSample,
    captureFeedback,
    recordDecision,
  };
}

function mergeRow<T extends { id: string }>(
  prev: T[],
  payload: { eventType: string; new: unknown; old: unknown },
): T[] {
  if (payload.eventType === "INSERT") {
    const row = payload.new as T;
    return prev.some((p) => p.id === row.id) ? prev : [row, ...prev];
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as T;
    return prev.map((p) => (p.id === row.id ? row : p));
  }
  if (payload.eventType === "DELETE") {
    const o = payload.old as { id: string };
    return prev.filter((p) => p.id !== o.id);
  }
  return prev;
}
