import { useMemo, useState } from "react";
import { Bell, AlertTriangle, Clock, TrendingDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePCPStore } from "@/lib/pcp/store";
import { saldoReferencia, pendenteReferencia } from "@/types/pcp";

type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  detail: string;
};

export function AlertsBell() {
  const lotes = usePCPStore((s) => s.lotes);
  const [open, setOpen] = useState(false);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const hoje = Date.now();
    const setorFila = new Map<string, number>();

    for (const l of lotes) {
      const prazo = new Date(l.data_prevista).getTime();
      const dias = Math.floor((prazo - hoje) / 86400000);
      const totalSaldo = l.referencias.reduce((a, r) => a + saldoReferencia(r), 0);
      const totalPendente = l.referencias.reduce((a, r) => a + pendenteReferencia(r), 0);

      if (dias < 0 && totalPendente > 0) {
        out.push({ id: `atr-${l.numero}`, severity: "critical", icon: <Clock className="w-3.5 h-3.5" />, title: `${l.numero} atrasado em ${Math.abs(dias)}d`, detail: `${totalPendente} pç pendentes · ${l.grupo}` });
      } else if (dias <= 3 && totalPendente > 0) {
        out.push({ id: `prazo-${l.numero}`, severity: "warning", icon: <Clock className="w-3.5 h-3.5" />, title: `${l.numero} vence em ${dias}d`, detail: `${totalPendente} pç pendentes` });
      }

      for (const r of l.referencias) {
        setorFila.set(r.setor_atual, (setorFila.get(r.setor_atual) ?? 0) + pendenteReferencia(r));
        const perdaPct = totalSaldo > 0 ? (r.qtd_perdida / Math.max(r.qtd_programada, 1)) * 100 : 0;
        if (perdaPct > 8) {
          out.push({ id: `perda-${l.numero}-${r.ref}`, severity: "warning", icon: <TrendingDown className="w-3.5 h-3.5" />, title: `${r.ref} com retrabalho alto`, detail: `${r.qtd_perdida} pç perdidas (${perdaPct.toFixed(1)}%) · ${l.numero}` });
        }
        if (r.status === "Aguardando" && pendenteReferencia(r) > 0) {
          out.push({ id: `parado-${l.numero}-${r.ref}`, severity: "info", icon: <Package className="w-3.5 h-3.5" />, title: `${r.ref} parado em ${r.setor_atual}`, detail: `${pendenteReferencia(r)} pç aguardando · ${l.numero}` });
        }
      }
    }

    const gargalo = [...setorFila.entries()].sort((a, b) => b[1] - a[1])[0];
    if (gargalo && gargalo[1] > 400) {
      out.unshift({ id: `gargalo-${gargalo[0]}`, severity: "critical", icon: <AlertTriangle className="w-3.5 h-3.5" />, title: `Gargalo em ${gargalo[0]}`, detail: `${gargalo[1]} pç na fila — capacidade comprometida` });
    }
    return out.slice(0, 20);
  }, [lotes]);

  const criticos = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 relative group">
          <Bell className="w-4 h-4 text-muted-foreground group-hover:text-white" />
          {alerts.length > 0 && (
            <span className={`absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${criticos > 0 ? "bg-rose-500 text-white ring-2 ring-background" : "bg-primary text-primary-foreground ring-2 ring-background"}`}>
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0 glass-card border-white/10 bg-black/95">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Alertas inteligentes
          </p>
          <span className="text-[9px] text-muted-foreground uppercase">{alerts.length} ativos</span>
        </div>
        <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
          {alerts.length === 0 && (
            <p className="p-6 text-center text-[11px] text-muted-foreground">Nenhum alerta. Operação fluindo.</p>
          )}
          {alerts.map((a) => (
            <div key={a.id} className="p-3 hover:bg-white/5 flex gap-3">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${a.severity === "critical" ? "bg-rose-500/15 text-rose-400" : a.severity === "warning" ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
