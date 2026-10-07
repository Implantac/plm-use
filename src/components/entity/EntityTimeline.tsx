// Timeline universal: consome entity_events para qualquer entidade.
// Substitui progressivamente LoteTimeline / CAPA timeline / activity feed por-entidade.
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileEdit,
  History,
  Link2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useEntityTimeline, type EntityType } from "@/hooks/use-entity-events";

const EVENT_ICON: Record<string, LucideIcon> = {
  created: Sparkles,
  status_changed: ArrowRight,
  commented: MessageSquare,
  approved: ShieldCheck,
  rejected: XCircle,
  assigned: Link2,
  attached: FileEdit,
  linked: Link2,
  erp_synced: History,
};

const EVENT_LABEL: Record<string, string> = {
  created: "Criado",
  status_changed: "Mudança de status",
  commented: "Comentário",
  approved: "Aprovado",
  rejected: "Reprovado",
  assigned: "Responsável definido",
  attached: "Anexo adicionado",
  linked: "Relação criada",
  erp_synced: "Sincronização ERP",
  "production.order.created": "OP criada",
  "production.order.status_changed": "Status da OP",
  "production.passage.total": "Passagem total",
  "production.passage.parcial": "Passagem parcial",
  "production.passage.retorno": "Retorno de etapa",
  "production.passage.perda": "Perda registrada",
  "production.passage.desvio": "Rota alternativa",
  "production.passage.ajuste": "Ajuste",
};

export function EntityTimeline({
  entityType,
  entityId,
  active = true,
  onNewCountChange,
}: {
  entityType: EntityType;
  entityId: string;
  active?: boolean;
  onNewCountChange?: (count: number) => void;
}) {
  const { items, loading } = useEntityTimeline(entityType, entityId);
  const baselineIdsRef = useRef<Set<string> | null>(null);

  // Dedupe by id defensively — subscription reconnects/replays could deliver
  // the same event multiple times before the hook's own de-dup catches up.
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof items = [];
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out;
  }, [items]);

  useEffect(() => {
    if (loading) return;
    const ids = new Set(uniqueItems.map((i) => i.id));
    if (baselineIdsRef.current === null) {
      baselineIdsRef.current = ids;
      onNewCountChange?.(0);
      return;
    }
    if (active) {
      baselineIdsRef.current = ids;
      onNewCountChange?.(0);
    } else {
      const baseline = baselineIdsRef.current;
      let diff = 0;
      for (const id of ids) if (!baseline.has(id)) diff++;
      onNewCountChange?.(diff);
    }
  }, [uniqueItems, active, loading, onNewCountChange]);

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
        Carregando eventos…
      </div>
    );
  }

  if (uniqueItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
        Sem eventos registrados ainda.
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-white/10" />
      {uniqueItems.map((it) => {
        const Icon = EVENT_ICON[it.event_type] ?? AlertTriangle;
        const label = EVENT_LABEL[it.event_type] ?? it.event_type;
        const ts = new Date(it.created_at);
        return (
          <li key={it.id} className="relative pl-8">
            <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white">{label}</p>
                  {(it.from_status || it.to_status) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {it.from_status ?? "—"} → {it.to_status ?? "—"}
                    </p>
                  )}
                  {it.note && (
                    <p className="text-[11px] text-white/80 mt-1">{it.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {ts.toLocaleDateString("pt-BR")}{" "}
                  {ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {it.actor_name && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {it.actor_name}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
