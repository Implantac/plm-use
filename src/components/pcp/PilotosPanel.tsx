// V5 · Painel de Pilotos dentro do ReferenciaDrawer.
// Resolve o UUID da referência pelo código, lista pilotos por rodada
// e permite criar novo piloto + avançar workflow via WorkflowStatusMenu.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Camera, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePilotos } from "@/hooks/use-pilotos";
import { WorkflowStatusMenu } from "@/components/workflow/WorkflowStatusMenu";
import { NovoPilotoDialog } from "./NovoPilotoDialog";

interface Props {
  referenciaRef: string;
  referenciaNome: string;
}

export function PilotosPanel({ referenciaRef, referenciaNome }: Props) {
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    supabase
      .from("references")
      .select("id")
      .eq("code", referenciaRef)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setReferenceId((data as { id: string } | null)?.id ?? null);
        setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [referenciaRef]);

  const { items, loading, refetch, upsertLocal } = usePilotos(
    referenceId ?? undefined,
  );
  const handleCreated = (p: import("@/hooks/use-pilotos").Piloto) => {
    upsertLocal(p); // Atualização otimista imediata do banner + lista.
    void refetch(); // Reconciliação em segundo plano.
  };

  if (resolving) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Resolvendo referência…
      </div>
    );
  }

  if (!referenceId) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-[11px] text-muted-foreground">
        Referência <span className="font-mono text-white">{referenciaRef}</span>{" "}
        ainda não está cadastrada em <code>references</code>. Crie-a no módulo
        Desenvolvimento para habilitar pilotos.
      </div>
    );
  }

  // H · Estado atual da repilotagem: rodada mais alta + seu status.
  const current = useMemo(() => {
    if (!items.length) return null;
    // items já vem ordenado por rodada desc
    return items[0];
  }, [items]);
  const canRepilot =
    !!current &&
    (current.status === "APROVADO" ||
      current.status === "REPROVADO" ||
      current.status === "AJUSTE_SOLICITADO");
  const nextTipo: "prova" | "ajuste" | "final" =
    current?.status === "APROVADO" ? "final" : "ajuste";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pilotos de {referenciaNome}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            {items.length} rodada{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <NovoPilotoDialog
          referenceId={referenceId}
          referenciaNome={referenciaNome}
          onCreated={() => void refetch()}
        />
      </div>

      {/* H · Banner de estado + repilotagem visível */}
      {current && (
        <div className="rounded-md border border-primary/25 bg-primary/[0.06] p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary/80">
              Estado atual
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                Rodada {current.rodada}
              </span>
              <Badge variant="outline" className="text-[9px] border-white/20">
                {current.tipo}
              </Badge>
              <StatusBadge status={current.status} />
            </div>
            {!canRepilot && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Aguardando avaliação para liberar reexecução.
              </p>
            )}
          </div>
          <NovoPilotoDialog
            referenceId={referenceId}
            referenciaNome={referenciaNome}
            currentRodada={current.rodada}
            defaultTipo={nextTipo}
            defaultStatus="EM_DESENVOLVIMENTO"
            defaultObservacoes={
              current.status === "AJUSTE_SOLICITADO"
                ? `Repilotagem após ajuste solicitado na rodada ${current.rodada}.`
                : current.status === "REPROVADO"
                  ? `Repilotagem após reprovação da rodada ${current.rodada}.`
                  : `Nova rodada a partir da rodada ${current.rodada}.`
            }
            onCreated={() => void refetch()}
            trigger={
              <Button
                size="sm"
                variant="default"
                className="gap-1 h-8 shrink-0"
                disabled={!canRepilot}
                title={
                  canRepilot
                    ? `Reexecutar como rodada ${current.rodada + 1}`
                    : "Avalie a rodada atual para reexecutar"
                }
              >
                <RotateCcw className="h-3 w-3" />
                Reexecutar (R{current.rodada + 1})
              </Button>
            }
          />
        </div>
      )}




      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
          Nenhum piloto criado. Clique em "Novo piloto" para iniciar a 1ª
          rodada.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div
              key={p.id}
              className="rounded-md border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Rodada {p.rodada}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-white/20"
                    >
                      {p.tipo}
                    </Badge>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.observacoes && (
                    <p className="mt-1 text-[11px] text-white/80 line-clamp-2">
                      {p.observacoes}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Criado {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.foto_url ? (
                    <img
                      src={p.foto_url}
                      alt=""
                      className="h-12 w-12 rounded object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-muted-foreground">
                      <Camera className="h-4 w-4" />
                    </div>
                  )}
                  <WorkflowStatusMenu
                    entityType="piloto"
                    entityId={p.id}
                    currentStatus={p.status}
                    onTransitioned={() => void refetch()}
                    size="sm"
                    variant="outline"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APROVADO"
      ? "border-emerald-400/40 text-emerald-300"
      : status === "REPROVADO"
        ? "border-rose-400/40 text-rose-300"
        : status === "AJUSTE_SOLICITADO"
          ? "border-amber-300/40 text-amber-300"
          : status === "EM_AVALIACAO"
            ? "border-sky-400/40 text-sky-300"
            : "border-white/20 text-white/80";
  return (
    <Badge variant="outline" className={`text-[9px] ${tone}`}>
      {status}
    </Badge>
  );
}
