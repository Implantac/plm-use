// Onda 76: o hook `useActivityFeed` vivia em `log.ts`, junto do
// `logActivity` puro. Como `log.ts` importa `react` no nível do módulo, a
// importação dinâmica fire-and-forget dos stores (`pcp/store`,
// `quality/store`) puxava o React para dentro da cadeia — e, quando um
// teste terminava antes de a importação resolver, o Vitest desmontava o
// ambiente e a carga tardia do React virava `EnvironmentTeardownError`
// (rejeição não tratada que derrubava o CI mesmo com todos os testes
// verdes). O hook mora aqui; `log.ts` fica sem React.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityEntry } from "./log";

export function useActivityFeed(limit = 30) {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (cancelled) return;
      setItems((data ?? []) as ActivityEntry[]);
      setLoading(false);
    };
    void load();
    const channel = supabase
      .channel(`activity-live-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          setItems((prev) => [payload.new as ActivityEntry, ...prev].slice(0, limit));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [limit]);

  return { items, loading };
}
