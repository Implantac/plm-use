// Activity log helpers. Onda 76: sem import de `react` aqui — o hook
// `useActivityFeed` mora em `./use-activity-feed`. Os stores importam este
// módulo dinamicamente (fire-and-forget) só para `logActivity`; com o React
// fora da cadeia, a carga tardia não derruba mais o ambiente de teste.
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
    (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Usuário";
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
