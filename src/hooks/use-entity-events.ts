// Timeline unificada: eventos polimórficos por entidade + emissor genérico.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type EntityType = Database["public"]["Enums"]["entity_type"];
export type EntityEvent = Database["public"]["Tables"]["entity_events"]["Row"];

export function useEntityTimeline(
  entityType: EntityType | null,
  entityId: string | null,
  limit = 200,
) {
  const [items, setItems] = useState<EntityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityType || !entityId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("entity_events")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data ?? []) as EntityEvent[]);
        setLoading(false);
      });

    const ch = supabase
      .channel(`entity-events-${entityType}-${entityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entity_events",
          filter: `entity_id=eq.${entityId}`,
        },
        (payload) => {
          const e = payload.new as EntityEvent;
          if (e.entity_type !== entityType) return;
          setItems((prev) =>
            prev.some((p) => p.id === e.id) ? prev : [e, ...prev],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [entityType, entityId, limit]);

  return { items, loading };
}

export function useEventEmitter() {
  const { user } = useAuth();

  const actorName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    null;

  const emit = useCallback(
    async (input: {
      entity_type: EntityType;
      entity_id: string;
      event_type: string;
      from_status?: string | null;
      to_status?: string | null;
      note?: string | null;
      payload?: Record<string, unknown>;
    }) => {
      if (!user) return false;
      const { error } = await supabase.from("entity_events").insert({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        event_type: input.event_type,
        from_status: input.from_status ?? null,
        to_status: input.to_status ?? null,
        note: input.note ?? null,
        payload: (input.payload ?? {}) as never,
        actor: user.id,
        actor_name: actorName,
      });
      return !error;
    },
    [user, actorName],
  );

  return { emit };
}
