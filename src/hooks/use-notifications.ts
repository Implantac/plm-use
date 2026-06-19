import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Notification = {
  id: string;
  user_id: string;
  external_id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string | null;
  source: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type NewNotification = Pick<
  Notification,
  "external_id" | "severity" | "title"
> &
  Partial<Pick<Notification, "detail" | "source" | "href">>;

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setItems(data as Notification[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as Notification;
              if (prev.some((p) => p.id === n.id)) return prev;
              return [n, ...prev].slice(0, 100);
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as Notification;
              return prev.map((p) => (p.id === n.id ? n : p));
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
      supabase.removeChannel(channel);
    };
  }, [user]);

  const syncDerived = useCallback(
    async (derived: NewNotification[]) => {
      if (!user || derived.length === 0) return;
      const existing = new Set(items.map((i) => i.external_id));
      const toInsert = derived
        .filter((d) => !existing.has(d.external_id))
        .map((d) => ({
          user_id: user.id,
          external_id: d.external_id,
          severity: d.severity,
          title: d.title,
          detail: d.detail ?? null,
          source: d.source ?? "pcp",
          href: d.href ?? null,
        }));
      if (toInsert.length === 0) return;
      await supabase.from("notifications").upsert(toInsert, {
        onConflict: "user_id,external_id",
        ignoreDuplicates: true,
      });
    },
    [user, items],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
  }, []);

  const unreadCount = items.filter((i) => !i.read_at).length;

  return { items, loading, unreadCount, syncDerived, markAsRead, markAllAsRead, remove };
}
