import { useState } from "react";
import { Activity, X } from "lucide-react";
import { useActivityFeed } from "@/lib/activity/log";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const actionColor: Record<string, string> = {
  create: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  update: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  delete: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  occurrence: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  capa: "text-violet-300 bg-violet-500/10 border-violet-500/30",
};

export function ActivityFeedButton() {
  const [open, setOpen] = useState(false);
  const { items, loading } = useActivityFeed(40);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Atividade do time"
          className="relative w-10 h-10 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center group"
        >
          <Activity className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
          {items.length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 bg-background/95 backdrop-blur-xl border-white/10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Atividade ao vivo
            </div>
            <div className="text-[11px] text-white mt-0.5">{items.length} eventos recentes</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ScrollArea className="max-h-[440px]">
          <div className="divide-y divide-white/5">
            {loading && (
              <div className="px-4 py-6 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Carregando...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-4 py-10 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Nenhuma atividade ainda
              </div>
            )}
            {items.map((it) => {
              const color =
                actionColor[it.action] ?? "text-muted-foreground bg-white/5 border-white/10";
              return (
                <div key={it.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[8px] uppercase tracking-[0.16em] font-bold border ${color}`}
                    >
                      {it.module}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white leading-snug">{it.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="font-medium text-white/70">{it.user_name}</span>
                        <span>·</span>
                        <span>há {timeAgo(it.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
