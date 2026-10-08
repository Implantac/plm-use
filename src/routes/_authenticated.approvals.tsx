// Módulo de Aprovações — gates do Fluxo do Produto, com status, data e eventos.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, Workflow, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import {
  GATES,
  GATE_STATUS_LABEL,
  gateById,
  useReferenceGates,
  type GateStatus,
} from "@/hooks/use-reference-gates";
import { useReferences, type ReferenceRow } from "@/hooks/use-references";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
  head: () => ({
    meta: [
      { title: "Aprovações · Gates do Produto · USE MODA PLM" },
      {
        name: "description",
        content:
          "Gates de aprovação do ciclo de vida do produto: status, data da decisão, responsável e eventos registrados na linha do tempo da referência.",
      },
      { property: "og:title", content: "Aprovações · Gates do Produto" },
      {
        property: "og:description",
        content:
          "Controle formal de aprovações por etapa do PLM, com parecer, data e histórico auditável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATUS_TONE: Record<GateStatus, string> = {
  pendente: "border-amber-400/40 text-amber-300",
  aprovado: "border-emerald-400/40 text-emerald-300",
  reprovado: "border-destructive/40 text-destructive",
  dispensado: "border-white/15 text-muted-foreground",
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

function ApprovalsPage() {
  const { items: refs, loading: loadingRefs } = useReferences();
  const { items: gates, loading, openGate, decide } = useReferenceGates();
  const { openEntity } = useEntityDrawer();
  const [parecer, setParecer] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refById = useMemo(() => {
    const m = new Map<string, ReferenceRow>();
    for (const r of refs) m.set(r.id, r);
    return m;
  }, [refs]);

  const pendentes = gates.filter((g) => g.status === "pendente");
  const aprovados = gates.filter((g) => g.status === "aprovado");
  const reprovados = gates.filter((g) => g.status === "reprovado");

  /** Referências que estão na etapa de um gate mas ainda não têm o gate aberto. */
  const pendingToOpen = useMemo(() => {
    const has = new Set(gates.map((g) => `${g.reference_id}:${g.gate}`));
    const out: { ref: ReferenceRow; gate: (typeof GATES)[number] }[] = [];
    for (const r of refs) {
      const gate = GATES.find((g) => g.status === r.status);
      if (gate && !has.has(`${r.id}:${gate.id}`)) out.push({ ref: r, gate });
    }
    return out;
  }, [refs, gates]);

  const handleDecide = async (id: string, status: GateStatus) => {
    setBusy(id);
    const ok = await decide(id, status, parecer[id] ?? null);
    setBusy(null);
    if (ok) {
      toast.success(`Gate marcado como ${GATE_STATUS_LABEL[status].toLowerCase()}.`);
      setParecer((p) => ({ ...p, [id]: "" }));
    } else {
      toast.error("Não foi possível registrar a decisão do gate.");
    }
  };

  const handleOpen = async (referenceId: string, gate: string) => {
    setBusy(`${referenceId}:${gate}`);
    const ok = await openGate(referenceId, gate);
    setBusy(null);
    if (ok) toast.success("Gate aberto para aprovação.");
    else toast.error("Não foi possível abrir o gate.");
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-lg border border-white/10 bg-white/[0.025] p-5 md:p-6">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]">
            Governança · gates do ciclo de vida
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold uppercase leading-none tracking-tight md:text-4xl">
          Aprovações
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cada portão do Fluxo do Produto com status, parecer e data da decisão. Toda aprovação vira
          evento na linha do tempo da referência.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Pendentes" value={pendentes.length} icon={Clock} tone="text-amber-300" />
          <Metric
            label="Aprovados"
            value={aprovados.length}
            icon={CheckCircle2}
            tone="text-emerald-300"
          />
          <Metric
            label="Reprovados"
            value={reprovados.length}
            icon={XCircle}
            tone="text-destructive"
          />
        </div>

        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link to="/flow">
            <Workflow className="mr-2 h-3.5 w-3.5" />
            Voltar ao Fluxo do Produto
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gates a abrir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingRefs && (
            <p className="py-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Carregando referências...
            </p>
          )}
          {!loadingRefs && pendingToOpen.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma referência aguardando abertura de gate.
            </p>
          )}
          {pendingToOpen.map(({ ref, gate }) => (
            <div
              key={`${ref.id}:${gate.id}`}
              className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {ref.code} · {ref.name}
                </p>
                <p className="mt-0.5 text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                  {gate.label} · dono {gate.owner} · {gate.criterio}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => void handleOpen(ref.id, gate.id)}
                disabled={busy === `${ref.id}:${gate.id}`}
                aria-busy={busy === `${ref.id}:${gate.id}`}
              >
                Abrir gate
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gates registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <p className="py-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Carregando aprovações...
            </p>
          )}
          {!loading && gates.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhum gate registrado ainda.
            </p>
          )}
          {gates.map((g) => {
            const ref = refById.get(g.reference_id);
            const def = gateById(g.gate);
            const status = g.status as GateStatus;
            return (
              <div key={g.id} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEntity({ type: "reference", id: g.reference_id })}
                    className="min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-semibold">
                      {ref ? `${ref.code} · ${ref.name}` : "Referência"}
                    </p>
                    <p className="mt-0.5 text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                      {def?.label ?? g.gate} · dono {def?.owner ?? "—"}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_TONE[status]}>
                      {GATE_STATUS_LABEL[status]}
                    </Badge>
                    <span className="text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                      decidido em {fmt(g.decided_at)}
                    </span>
                  </div>
                </div>

                {g.parecer && (
                  <p className="mt-2 text-xs text-muted-foreground">Parecer: {g.parecer}</p>
                )}

                {status === "pendente" ? (
                  <div className="mt-3 space-y-2">
                    <Label
                      htmlFor={`parecer-${g.id}`}
                      className="text-2xs uppercase tracking-[0.16em]"
                    >
                      Parecer da decisão
                    </Label>
                    <Textarea
                      id={`parecer-${g.id}`}
                      rows={2}
                      placeholder="Registre o motivo da aprovação ou reprovação"
                      value={parecer[g.id] ?? ""}
                      onChange={(e) => setParecer((p) => ({ ...p, [g.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleDecide(g.id, "aprovado")}
                        disabled={busy === g.id}
                        aria-busy={busy === g.id}
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDecide(g.id, "reprovado")}
                        disabled={busy === g.id}
                      >
                        <XCircle className="mr-2 h-3.5 w-3.5" />
                        Reprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDecide(g.id, "dispensado")}
                        disabled={busy === g.id}
                      >
                        Dispensar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => void handleDecide(g.id, "pendente")}
                    disabled={busy === g.id}
                  >
                    Reabrir gate
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <div className={`flex items-center gap-2 ${tone}`}>
        <Icon className="h-4 w-4" />
        <span className="text-2xs font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
