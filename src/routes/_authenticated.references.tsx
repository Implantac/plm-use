// Núcleo do PLM — gestão da entidade unificada "Referência".
// Ponto central para criar, filtrar e abrir referências no drawer universal.
import { useEffect, useMemo, useState } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { NovaReferenciaDialog } from "@/components/references/NovaReferenciaDialog";
import { NovoPilotoDialog } from "@/components/pcp/NovoPilotoDialog";
import {
  REFERENCE_STATUSES,
  REFERENCE_STATUS_LABEL,
  useReferences,
  type ReferenceStatus,
} from "@/hooks/use-references";

export const Route = createFileRoute("/_authenticated/references")({
  component: ReferencesPage,
});

function ReferencesPage() {
  const { items, loading, create } = useReferences();
  const { openEntity } = useEntityDrawer();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReferenceStatus | "TODOS">("TODOS");
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => onQuickAction("quick:new-reference", () => setOpenNew(true)), []);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (statusFilter !== "TODOS" && r.status !== statusFilter) return false;
      if (!q) return true;
      const t =
        `${r.code} ${r.name} ${r.collection_id ?? ""} ${r.line ?? ""} ${r.theme ?? ""}`.toLowerCase();
      return t.includes(q.toLowerCase());
    });
  }, [items, q, statusFilter]);

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of items) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [items]);

  const emDev = REFERENCE_STATUSES.filter((s) => s !== "FINALIZADA" && s !== "ARQUIVADA").reduce(
    (a, s) => a + (byStatus[s] ?? 0),
    0,
  );

  return (
    <ModuleLayout
      title="Núcleo — Referências"
      subtitle="A referência é a peça em desenvolvimento. Tudo no PLM orbita em torno dela: ficha, piloto, lote, CAPA, custos, ERP."
      version="Núcleo PLM v1.0"
      searchPlaceholder="Buscar referência, coleção, linha…"
      metrics={[
        { label: "Total", value: String(items.length), detail: "no núcleo" },
        { label: "Em desenvolvimento", value: String(emDev), detail: "ativas" },
        {
          label: "Aprovadas",
          value: String(byStatus.APROVACAO ?? 0),
          detail: "aguardando engenharia",
        },
        { label: "Finalizadas", value: String(byStatus.FINALIZADA ?? 0), detail: "prontas" },
      ]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="pl-9 bg-white/[0.03] text-[12px]"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ReferenceStatus | "TODOS")}
            >
              <SelectTrigger className="w-[180px] bg-white/[0.03] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                {REFERENCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REFERENCE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setOpenNew(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova referência
          </Button>
          <NovaReferenciaDialog
            open={openNew}
            onOpenChange={setOpenNew}
            existingCodes={items.map((r) => r.code)}
            onCreate={(input) => create(input)}
            onCreated={(created) =>
              openEntity({
                type: "reference",
                id: created.id,
                title: created.name,
                subtitle: created.code,
              })
            }
          />
        </div>

        {loading ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-[11px] text-muted-foreground">
            Carregando núcleo…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Nenhuma referência ainda. Crie a primeira — ela virá a se conectar com ficha, piloto,
            lote e CAPA.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((r) => (
              <Card
                key={r.id}
                className="glass-card cursor-pointer hover:border-primary/40 transition"
                onClick={() =>
                  openEntity({
                    type: "reference",
                    id: r.id,
                    title: r.name,
                    subtitle: r.code,
                  })
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {r.code}
                      </p>
                      <p className="text-sm font-bold text-white truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {[r.collection_id, r.line, r.theme].filter(Boolean).join(" · ") ||
                          "sem coleção"}
                      </p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-primary/30 shrink-0">
                      {REFERENCE_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 uppercase tracking-wider">
                      {r.priority}
                    </span>
                    {r.erp_product_id && (
                      <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 uppercase tracking-wider text-emerald-300">
                        ERP {r.erp_product_id}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-3 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <NovoPilotoDialog
                      referenceId={r.id}
                      referenciaNome={`${r.code} · ${r.name}`}
                      trigger={
                        <Button size="sm" variant="outline" className="h-7 text-[10px]">
                          <Plus className="mr-1 h-3 w-3" />
                          Novo piloto
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px]"
                      onClick={() =>
                        openEntity({
                          type: "reference",
                          id: r.id,
                          title: r.name,
                          subtitle: r.code,
                        })
                      }
                    >
                      Abrir ciclo de vida
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
