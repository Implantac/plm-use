// Grafo de relacionamentos entre entidades do PLM (e IDs externos do ERP).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";
import type { EntityType } from "@/hooks/use-entity-events";

export type EntityRelation = Database["public"]["Tables"]["entity_relations"]["Row"];

export function useEntityRelations(entityType: EntityType | null, entityId: string | null) {
  const { user } = useAuth();
  const [outgoing, setOutgoing] = useState<EntityRelation[]>([]);
  const [incoming, setIncoming] = useState<EntityRelation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entityType || !entityId) {
      setOutgoing([]);
      setIncoming([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [out, inn] = await Promise.all([
      supabase
        .from("entity_relations")
        .select("*")
        .eq("from_type", entityType)
        .eq("from_id", entityId),
      supabase.from("entity_relations").select("*").eq("to_type", entityType).eq("to_id", entityId),
    ]);
    setOutgoing((out.data ?? []) as EntityRelation[]);
    setIncoming((inn.data ?? []) as EntityRelation[]);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const link = useCallback(
    async (input: {
      to_type: EntityType;
      to_id?: string | null;
      to_external_id?: string | null;
      relation: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user || !entityType || !entityId) return false;
      const { error } = await supabase.from("entity_relations").insert({
        from_type: entityType,
        from_id: entityId,
        to_type: input.to_type,
        to_id: input.to_id ?? null,
        to_external_id: input.to_external_id ?? null,
        relation: input.relation,
        metadata: (input.metadata ?? {}) as never,
        created_by: user.id,
      });
      if (!error) await load();
      return !error;
    },
    [user, entityType, entityId, load],
  );

  const unlink = useCallback(
    async (id: string) => {
      await supabase.from("entity_relations").delete().eq("id", id);
      await load();
    },
    [load],
  );

  return { outgoing, incoming, loading, link, unlink, reload: load };
}
