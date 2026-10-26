// Feed de atividade real. A versão anterior exibia posts fabricados ("Julia
// Designer", curtidas, comentários) — numa ferramenta vendida como o pulso da
// operação, isso era a mentira mais cara do produto. Agora cada linha é um
// evento de public.entity_events: passagens de status do PCP, aprovações de
// amostra, fichas técnicas, lançamentos e o mirror do creative-sync. Se o
// banco estiver inacessível, a tela diz isso em uma linha e não quebra.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { countByEntityType, feedItemsFromRows, type FeedEventRow } from "@/lib/feed/items";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

const PAGE_LIMIT = 60;

function FeedPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FeedEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("entity_events")
      .select(
        "id,entity_type,entity_id,event_type,from_status,to_status,note,actor_name,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        setRows((data ?? []) as FeedEventRow[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`feed-entity-events-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "entity_events" },
        (msg) => {
          const row = msg.new as FeedEventRow;
          setRows((prev) =>
            prev.some((p) => p.id === row.id) ? prev : [row, ...prev].slice(0, PAGE_LIMIT),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const chips = useMemo(() => countByEntityType(rows), [rows]);
  const items = useMemo(() => {
    const scoped = filter ? rows.filter((r) => r.entity_type === filter) : rows;
    return feedItemsFromRows(scoped);
  }, [rows, filter]);

  return (
    <div className="space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-2">Atividade</h1>
        <p className="text-muted-foreground text-sm font-light italic lowercase">
          o pulso real da sua marca — eventos gravados pelo pc p, fichas, amostras e lançamentos, ao
          vivo do banco.
        </p>
      </motion.div>

      {failed && (
        <Card className="glass-card rounded-full p-6 border-status-progress/20">
          <CardContent className="p-0 flex items-start gap-3 text-sm text-status-progress/90">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              A trilha de atividade está inacessível no momento — o restante do sistema segue
              funcionando normalmente.
            </span>
          </CardContent>
        </Card>
      )}

      {chips.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-3 py-1 text-xs border transition-colors ${
              !filter
                ? "border-border-strong bg-muted text-white"
                : "border-border text-muted-foreground hover:text-white"
            }`}
          >
            tudo ({rows.length})
          </button>
          {chips.map((chip) => (
            <button
              key={chip.type}
              onClick={() => setFilter(chip.type === filter ? null : chip.type)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors capitalize ${
                chip.type === filter
                  ? "border-border-strong bg-muted text-white"
                  : "border-border text-muted-foreground hover:text-white"
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="glass-card rounded-full p-10">
          <CardContent className="p-0 flex items-center gap-3 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 animate-pulse" />
            carregando a trilha de atividade…
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="glass-card rounded-full p-10">
          <CardContent className="p-0 flex flex-col items-center text-center gap-3 py-6">
            <Inbox className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground max-w-md">
              Nenhum evento nesta visão ainda. Mudanças de status de lotes, aprovações de amostra,
              publicações de showroom e edições nos módulos criativos alimentam este feed
              automaticamente.
            </p>
            <Link
              to="/production"
              className="text-xs text-white/70 underline underline-offset-4 hover:text-white flex items-center gap-1"
            >
              acompanhar o pc p <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.03 }}
            >
              <Card className="glass-card rounded-full">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted/50 flex items-center justify-center text-2xs font-bold text-white/80">
                    {item.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold text-white">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">{item.verb}</span>{" "}
                      <span className="font-medium text-white/90 capitalize">{item.target}</span>
                      <span className="ml-1.5 font-mono text-2xs text-muted-foreground/70">
                        #{item.ref}
                      </span>
                      {item.statusFrom && item.statusTo && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-2xs capitalize border-border-strong/70 align-middle"
                        >
                          {item.statusFrom} → {item.statusTo}
                        </Badge>
                      )}
                    </p>
                    {item.note && (
                      <p className="mt-1.5 text-xs text-muted-foreground/90 line-clamp-2">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">{item.when}</span>
                    {item.route && (
                      <button
                        onClick={() => navigate({ to: item.route })}
                        className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                      >
                        abrir <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
