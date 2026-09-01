// Activity log helpers + realtime feed hook.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityEntry = {
  id: string;
  user_id: string | null;
  user_name: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type LogInput = {
  module: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogInput) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return;
  const user_name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuário";
  await supabase.from("activity_log").insert({
    user_id: user.id,
    user_name,
    module: input.module,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    action: input.action,
    message: input.message,
    metadata: (input.metadata ?? {}) as unknown as never,
  });
}

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
