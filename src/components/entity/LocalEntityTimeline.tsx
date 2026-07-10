// Timeline visual para eventos locais. Reaproveita a estética de EntityTimeline
// mas lê do log local (localStorage) em vez de public.entity_events.
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
import { useLocalEntityTimeline, type LocalEntityType } from "@/lib/local-events/store";

const EVENT_ICON: Record<string, LucideIcon> = {
  created: Sparkles,
  updated: FileEdit,
  status_changed: ArrowRight,
  approved: ShieldCheck,
  rejected: XCircle,
  cloned: Link2,
  color_added: Sparkles,
  color_removed: XCircle,
  item_added: Sparkles,
  item_removed: XCircle,
  item_moved: ArrowRight,
  commented: MessageSquare,
  archived: History,
};

const EVENT_LABEL: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  status_changed: "Mudança de status",
  approved: "Aprovado",
  rejected: "Reprovado",
  cloned: "Clonado",
  color_added: "Cor adicionada",
  color_removed: "Cor removida",
  item_added: "Item adicionado",
  item_removed: "Item removido",
  item_moved: "Item movido",
  commented: "Comentário",
  archived: "Arquivado",
};

export function LocalEntityTimeline({
  entityType,
  entityId,
}: {
  entityType: LocalEntityType;
  entityId: string;
}) {
  const { items } = useLocalEntityTimeline(entityType, entityId);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-[11px] text-muted-foreground">
        Sem eventos registrados ainda para esta entidade.
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
      {items.map((it) => {
        const Icon = EVENT_ICON[it.event_type] ?? AlertTriangle;
        const label = EVENT_LABEL[it.event_type] ?? it.event_type;
        const ts = new Date(it.created_at);
        return (
          <li key={it.id} className="relative pl-8">
            <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-md border border-border bg-card/40 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{label}</p>
                  {(it.from_status || it.to_status) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {it.from_status ?? "—"} → {it.to_status ?? "—"}
                    </p>
                  )}
                  {it.note && <p className="text-[11px] text-foreground/80 mt-1">{it.note}</p>}
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
