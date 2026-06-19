import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  TrendingDown,
  Package,
  CheckCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePCPStore } from "@/lib/pcp/store";
import { saldoReferencia, pendenteReferencia } from "@/types/pcp";
import { useNotifications, type NewNotification } from "@/hooks/use-notifications";

type Severity = "critical" | "warning" | "info";

function iconFor(source: string, severity: Severity) {
  if (source === "gargalo") return <AlertTriangle className="w-3.5 h-3.5" />;
  if (source === "perda") return <TrendingDown className="w-3.5 h-3.5" />;
  if (source === "parado") return <Package className="w-3.5 h-3.5" />;
  if (severity === "critical" || source === "atraso" || source === "prazo")
    return <Clock className="w-3.5 h-3.5" />;
  return <Bell className="w-3.5 h-3.5" />;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function AlertsBell() {
  const lotes = usePCPStore((s) => s.lotes);
  const [open, setOpen] = useState(false);
  const { items, unreadCount, syncDerived, markAsRead, markAllAsRead, remove } =
    useNotifications();

  const derived = useMemo<NewNotification[]>(() => {
    const out: NewNotification[] = [];
    const hoje = Date.now();
    const setorFila = new Map<string, number>();

    for (const l of lotes) {
      const prazo = new Date(l.data_prevista).getTime();
      const dias = Math.floor((prazo - hoje) / 86400000);
      const totalSaldo = l.referencias.reduce((a, r) => a + saldoReferencia(r), 0);
      const totalPendente = l.referencias.reduce((a, r) => a + pendenteReferencia(r), 0);

      if (dias < 0 && totalPendente > 0) {
        out.push({
          external_id: `atraso:${l.numero}`,
          severity: "critical",
          source: "atraso",
          title: `${l.numero} atrasado em ${Math.abs(dias)}d`,
          detail: `${totalPendente} pç pendentes · ${l.grupo}`,
        });
      } else if (dias <= 3 && totalPendente > 0) {
        out.push({
          external_id: `prazo:${l.numero}`,
          severity: "warning",
          source: "prazo",
          title: `${l.numero} vence em ${dias}d`,
          detail: `${totalPendente} pç pendentes`,
        });
      }

      for (const r of l.referencias) {
        setorFila.set(r.setor_atual, (setorFila.get(r.setor_atual) ?? 0) + pendenteReferencia(r));
        const perdaPct = totalSaldo > 0 ? (r.qtd_perdida / Math.max(r.qtd_programada, 1)) * 100 : 0;
        if (perdaPct > 8) {
          out.push({
            external_id: `perda:${l.numero}:${r.ref}`,
            severity: "warning",
            source: "perda",
            title: `${r.ref} com retrabalho alto`,
            detail: `${r.qtd_perdida} pç perdidas (${perdaPct.toFixed(1)}%) · ${l.numero}`,
          });
        }
        if (r.status === "Aguardando" && pendenteReferencia(r) > 0) {
          out.push({
            external_id: `parado:${l.numero}:${r.ref}`,
            severity: "info",
            source: "parado",
            title: `${r.ref} parado em ${r.setor_atual}`,
            detail: `${pendenteReferencia(r)} pç aguardando · ${l.numero}`,
          });
        }
      }
    }

    const gargalo = [...setorFila.entries()].sort((a, b) => b[1] - a[1])[0];
    if (gargalo && gargalo[1] > 400) {
      out.unshift({
        external_id: `gargalo:${gargalo[0]}`,
        severity: "critical",
        source: "gargalo",
        title: `Gargalo em ${gargalo[0]}`,
        detail: `${gargalo[1]} pç na fila — capacidade comprometida`,
      });
    }
    return out;
  }, [lotes]);

  useEffect(() => {
    syncDerived(derived);
  }, [derived, syncDerived]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 relative group"
        >
          <Bell className="w-4 h-4 text-muted-foreground group-hover:text-white" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-rose-500 text-white ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[420px] p-0 glass-card border-white/10 bg-black/95"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Alertas
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground uppercase">
              {items.length} · {unreadCount} novos
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[9px] uppercase tracking-[0.16em] text-primary hover:text-white flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Marcar tudo
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
          {items.length === 0 && (
            <p className="p-6 text-center text-[11px] text-muted-foreground">
              Nenhum alerta. Operação fluindo.
            </p>
          )}
          {items.map((n) => {
            const isRead = !!n.read_at;
            return (
              <div
                key={n.id}
                className={`group p-3 flex gap-3 transition-colors ${
                  isRead ? "opacity-55 hover:bg-white/5" : "bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    n.severity === "critical"
                      ? "bg-rose-500/15 text-rose-400"
                      : n.severity === "warning"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-primary/15 text-primary"
                  }`}
                >
                  {iconFor(n.source, n.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    <p className="text-[11px] font-bold text-white truncate">{n.title}</p>
                  </div>
                  {n.detail && (
                    <p className="text-[10px] text-muted-foreground">{n.detail}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.16em] mt-1">
                    {n.source} · {relativeTime(n.created_at)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      title="Marcar como lido"
                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-white/10"
                    >
                      <CheckCheck className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    title="Remover"
                    className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-white/10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
