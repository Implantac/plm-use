// Timeline consolidada do lote: unifica passagens, ocorrências e eventos de CAPA
// em uma única linha do tempo rastreável.
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MinusCircle,
  PlusCircle,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useCapa } from "@/hooks/use-capa";
import type { Lote } from "@/types/pcp";

type TimelineItem = {
  id: string;
  ts: string;
  ref?: string;
  setor?: string;
  actor?: string;
  kind:
    | "passagem-integral"
    | "passagem-parcial"
    | "retrabalho"
    | "ocor-pos"
    | "ocor-neg"
    | "ocor-neutra"
    | "capa";
  title: string;
  detail?: string;
};

export function LoteTimeline({ lote }: { lote: Lote }) {
  const { items: capas, eventsOf } = useCapa();

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];

    for (const r of lote.referencias) {
      for (const p of r.passagens) {
        const isRetrab = p.linha === "2a";
        out.push({
          id: `p-${p.id}`,
          ts: p.timestamp,
          ref: r.ref,
          setor: p.setor_origem,
          actor: p.responsavel,
          kind: isRetrab
            ? "retrabalho"
            : p.tipo === "integral"
              ? "passagem-integral"
              : "passagem-parcial",
          title: isRetrab
            ? `Retrabalho · ${p.qtd} pç`
            : `${p.tipo === "integral" ? "Passagem integral" : "Passagem parcial"} · ${p.qtd} pç`,
          detail: `${p.setor_origem}${p.setor_destino ? ` → ${p.setor_destino}` : ""}${p.defeito ? ` · ${p.defeito}` : ""}${p.observacao ? ` · ${p.observacao}` : ""}`,
        });
      }
      for (const o of r.ocorrencias) {
        out.push({
          id: `o-${o.id}`,
          ts: o.timestamp,
          ref: r.ref,
          setor: o.setor,
          actor: o.responsavel,
          kind:
            o.tipo === "positiva"
              ? "ocor-pos"
              : o.tipo === "negativa"
                ? "ocor-neg"
                : "ocor-neutra",
          title: `Ocorrência ${o.tipo} · ${o.qtd} pç`,
          detail: `${o.motivo}${o.observacao ? ` · ${o.observacao}` : ""}`,
        });
      }
    }

    // CAPAs vinculadas ao lote
    const linked = capas.filter((c) => c.lote && c.lote === lote.numero);
    for (const c of linked) {
      const evs = eventsOf(c.id);
      for (const e of evs) {
        out.push({
          id: `c-${e.id}`,
          ts: e.created_at,
          ref: c.ref ?? undefined,
          setor: c.setor,
          actor: e.actor_name ?? undefined,
          kind: "capa",
          title: `CAPA · ${e.event}`,
          detail: [
            e.from_status && e.to_status
              ? `${e.from_status} → ${e.to_status}`
              : e.to_status ?? undefined,
            c.defeito,
            e.note ?? undefined,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      }
    }

    return out.sort((a, b) => b.ts.localeCompare(a.ts));
  }, [lote, capas, eventsOf]);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-[11px] text-muted-foreground">
        Nenhum evento registrado neste lote ainda.
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-white/10" />
      {items.map((it) => (
        <TimelineRow key={it.id} item={it} />
      ))}
    </ol>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const meta = kindMeta(item.kind);
  const Icon = meta.icon;
  const ts = new Date(item.ts);
  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border ${meta.tone}`}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white">{item.title}</p>
            {item.detail && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                {item.detail}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
            {ts.toLocaleDateString("pt-BR")}{" "}
            {ts.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-wider">
          {item.ref && (
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">
              {item.ref}
            </span>
          )}
          {item.setor && (
            <span className="rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-muted-foreground">
              {item.setor}
            </span>
          )}
          {item.actor && (
            <span className="rounded border border-white/10 px-1.5 py-0.5 text-muted-foreground">
              {item.actor}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function kindMeta(k: TimelineItem["kind"]) {
  switch (k) {
    case "passagem-integral":
      return {
        icon: Truck,
        tone: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
      };
    case "passagem-parcial":
      return {
        icon: ArrowRight,
        tone: "text-sky-300 border-sky-400/40 bg-sky-400/10",
      };
    case "retrabalho":
      return {
        icon: Clock,
        tone: "text-amber-300 border-amber-400/40 bg-amber-400/10",
      };
    case "ocor-pos":
      return {
        icon: PlusCircle,
        tone: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
      };
    case "ocor-neg":
      return {
        icon: MinusCircle,
        tone: "text-rose-300 border-rose-400/40 bg-rose-400/10",
      };
    case "ocor-neutra":
      return {
        icon: AlertTriangle,
        tone: "text-muted-foreground border-white/15 bg-white/[0.03]",
      };
    case "capa":
      return {
        icon: ShieldAlert,
        tone: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10",
      };
    default:
      return {
        icon: CheckCircle2,
        tone: "text-white border-white/15 bg-white/[0.04]",
      };
  }
}
