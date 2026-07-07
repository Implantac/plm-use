// V5 · Painel de Pilotos dentro do ReferenciaDrawer.
// Resolve o UUID da referência pelo código, lista pilotos por rodada
// e permite criar novo piloto + avançar workflow via WorkflowStatusMenu.
import { useEffect, useState } from "react";
import { Plus, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePilotos, useCreatePiloto } from "@/hooks/use-pilotos";
import { WorkflowStatusMenu } from "@/components/workflow/WorkflowStatusMenu";
import { toast } from "sonner";

interface Props {
  referenciaRef: string;
  referenciaNome: string;
}

export function PilotosPanel({ referenciaRef, referenciaNome }: Props) {
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const { items, loading, refetch } = usePilotos(referenceId ?? undefined);
  const { create } = useCreatePiloto();

  const handleCreate = async () => {
    if (!referenceId) return;
    setCreating(true);
    const p = await create({ reference_id: referenceId, tipo: "prova" });
    setCreating(false);
    if (p) {
      toast.success(`Piloto rodada ${p.rodada} criado`);
      await refetch();
    } else {
      toast.error("Falha ao criar piloto");
    }
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={creating}
          className="gap-1 h-8"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Novo piloto
        </Button>
      </div>

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
