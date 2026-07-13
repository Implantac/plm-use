// V5 · Painel de Pilotos dentro do ReferenciaDrawer.
// Resolve o UUID da referência pelo código, lista pilotos por rodada
// e permite criar novo piloto + avançar workflow via WorkflowStatusMenu.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Camera, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePilotos } from "@/hooks/use-pilotos";
import { WorkflowStatusMenu } from "@/components/workflow/WorkflowStatusMenu";
import { NovoPilotoDialog } from "./NovoPilotoDialog";
import { toast } from "sonner";

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

  const { items, loading, refetch, upsertLocal, removeLocal } = usePilotos(
    referenceId ?? undefined,
  );
  const [repiloting, setRepiloting] = useState<{
    active: boolean;
    rodada: number | null;
  }>({ active: false, rodada: null });
  const [repilotError, setRepilotError] = useState<{
    message: string;
    optimisticId: string;
    piloto: import("@/hooks/use-pilotos").Piloto;
  } | null>(null);
  const [confirmedRodada, setConfirmedRodada] = useState<number | null>(null);

  // Limpa o estado "confirmada" após 6s para não poluir o banner.
  useEffect(() => {
    if (confirmedRodada == null) return;
    const t = setTimeout(() => setConfirmedRodada(null), 6000);
    return () => clearTimeout(t);
  }, [confirmedRodada]);

  const confirmRepilot = async (
    p: import("@/hooks/use-pilotos").Piloto,
  ): Promise<void> => {
    setRepiloting({ active: true, rodada: p.rodada });
    try {
      await refetch();
      setRepilotError(null);
      setConfirmedRodada(p.rodada);
      toast.success(`Reexecução confirmada · R${p.rodada}`, {
        description: `${referenciaNome} · Rodada ${p.rodada} sincronizada com o servidor.`,
      });
    } catch (e) {
      // Rollback: remove a rodada otimista e expõe o erro no banner.
      removeLocal(p.id);
      const message =
        e instanceof Error ? e.message : "Falha ao confirmar rodada";
      setRepilotError({
        message,
        optimisticId: p.id,
        piloto: p,
      });
      toast.error(`Falha ao confirmar rodada ${p.rodada}`, {
        description: message,
      });
    } finally {
      setRepiloting({ active: false, rodada: null });
    }
  };

  const handleCreated = async (p: import("@/hooks/use-pilotos").Piloto) => {
    setRepilotError(null);
    upsertLocal(p); // Atualização otimista imediata.
    await confirmRepilot(p);
  };

  const retryConfirmation = async () => {
    if (!repilotError) return;
    // Reinsere otimista e tenta reconfirmar.
    const p = repilotError.piloto;
    setRepilotError(null);
    upsertLocal(p);
    await confirmRepilot(p);
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
          onCreated={handleCreated}
        />
      </div>

      {/* H · Banner de estado + repilotagem visível (com estado de erro) */}
      {current && (
        <div
          className={`rounded-md border p-3 flex items-center justify-between gap-3 ${
            repilotError
              ? "border-rose-400/40 bg-rose-500/[0.08]"
              : "border-primary/25 bg-primary/[0.06]"
          }`}
        >
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
              {repiloting.active && (
                <Badge
                  variant="outline"
                  className="text-[9px] gap-1 border-primary/50 text-primary animate-pulse"
                >
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Reexecutando…
                </Badge>
              )}
              {repilotError && !repiloting.active && (
                <Badge
                  variant="outline"
                  className="text-[9px] gap-1 border-rose-400/50 text-rose-300"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Falha ao reexecutar
                </Badge>
              )}
            </div>
            {repiloting.active ? (
              <p className="mt-1 text-[10px] text-primary/80">
                Aguardando confirmação do servidor para a Rodada{" "}
                {repiloting.rodada}…
              </p>
            ) : repilotError ? (
              <p className="mt-1 text-[10px] text-rose-300">
                Rodada {repilotError.piloto.rodada} foi revertida.{" "}
                {repilotError.message}
              </p>
            ) : (
              !canRepilot && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Aguardando avaliação para liberar reexecução.
                </p>
              )
            )}
          </div>
          {repilotError ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 shrink-0 border-rose-400/40 text-rose-200 hover:bg-rose-500/10"
              onClick={() => void retryConfirmation()}
            >
              <RotateCcw className="h-3 w-3" />
              Tentar novamente
            </Button>
          ) : (
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
            onCreated={handleCreated}
            trigger={
              <Button
                size="sm"
                variant="default"
                className="gap-1 h-8 shrink-0"
                disabled={!canRepilot || repiloting.active}
                title={
                  repiloting.active
                    ? "Aguardando confirmação do servidor…"
                    : canRepilot
                      ? `Reexecutar como rodada ${current.rodada + 1}`
                      : "Avalie a rodada atual para reexecutar"
                }
              >
                {repiloting.active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                {repiloting.active
                  ? "Reexecutando…"
                  : `Reexecutar (R${current.rodada + 1})`}
              </Button>
            }
          />
          )}
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
