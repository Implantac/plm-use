// Live presence: rastreia usuários ativos em um canal/módulo via Supabase Realtime presence.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PresenceUser = {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
  module: string;
};

export function usePresence(channelKey: string, user: User | null, module: string) {
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(channelKey, {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      const state = channel.presenceState<PresenceUser>();
      const flat: PresenceUser[] = [];
      Object.values(state).forEach((arr) => arr.forEach((p) => flat.push(p)));
      // de-dup por user_id (mantém o mais recente por módulo)
      const dedup = new Map<string, PresenceUser>();
      flat.forEach((p) => dedup.set(p.user_id, p));
      setOnline(Array.from(dedup.values()));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          user_id: user.id,
          email: user.email ?? "",
          full_name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "Usuário",
          avatar_url: user.user_metadata?.avatar_url as string | undefined,
          online_at: new Date().toISOString(),
          module,
        });
      });

    return () => {
      void channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [channelKey, user, module]);

  return online;
}
