import { useMemo, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ruler, Layers, CheckCircle2, Archive, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LocalHistoryButton } from "@/components/entity/LocalHistoryButton";
import {
  listCharts,
  subscribe,
  upsertChart,
  deleteChart,
  type MeasurementChart,
} from "@/lib/measurements/store";

export const Route = createFileRoute("/_authenticated/measurements")({
  component: MeasurementsPage,
});

function useCharts() {
  return useSyncExternalStore(subscribe, listCharts, listCharts);
}

function MeasurementsPage() {
  const charts = useCharts();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | MeasurementChart["status"]>(
    "todos",
  );
  const [selectedId, setSelectedId] = useState<string | null>(charts[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [newChart, setNewChart] = useState({
    code: "",
    name: "",
    category: "Top" as MeasurementChart["category"],
    segment: "Feminino" as MeasurementChart["segment"],
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return charts.filter((c) => {
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [charts, query, statusFilter]);

  const selected = charts.find((c) => c.id === selectedId) ?? filtered[0];

  const handleCreate = () => {
    if (!newChart.code.trim() || !newChart.name.trim()) {
      toast.error("Informe código e nome");
      return;
    }
    const id = `tm-${Date.now()}`;
    upsertChart({
      id,
      code: newChart.code.toUpperCase(),
      name: newChart.name,
      category: newChart.category,
      segment: newChart.segment,
      fit: "regular",
      unit: "cm",
      linkedRefs: 0,
      status: "rascunho",
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: "Você",
      points: [
        { id: "p1", code: "PA", label: "Peito", toleranceCm: 1 },
        { id: "p2", code: "CI", label: "Cintura", toleranceCm: 1 },
        { id: "p3", code: "QU", label: "Quadril", toleranceCm: 1 },
      ],
      grade: [
        { size: "P", values: { PA: 86, CI: 70, QU: 92 } },
        { size: "M", values: { PA: 90, CI: 74, QU: 96 } },
        { size: "G", values: { PA: 94, CI: 78, QU: 100 } },
      ],
    });
    setSelectedId(id);
    setCreating(false);
    setNewChart({ code: "", name: "", category: "Top", segment: "Feminino" });
    toast.success("Tabela de medidas criada");
  };

  const totals = useMemo(
    () => ({
      total: charts.length,
      aprovadas: charts.filter((c) => c.status === "aprovada").length,
      rascunho: charts.filter((c) => c.status === "rascunho").length,
      arquivadas: charts.filter((c) => c.status === "arquivada").length,
    }),
    [charts],
  );

  return (
    <ModuleLayout
      title="Tabela de Medidas"
      subtitle="Grades pré-cadastradas com tolerância e vinculação à ficha técnica. Suporta múltiplas tabelas por linha, categoria e marca."
      version="Engineering v3.0"
      onAdd={() => setCreating(true)}
      searchPlaceholder="Buscar tabela, código ou categoria"
      metrics={[
        { label: "Grades", value: String(totals.total), detail: "cadastradas" },
        { label: "Aprovadas", value: String(totals.aprovadas), detail: "prontas para uso" },
        { label: "Rascunho", value: String(totals.rascunho), detail: "em revisão" },
        {
          label: "Refs vinculadas",
          value: String(charts.reduce((s, c) => s + c.linkedRefs, 0)),
          detail: "fichas técnicas",
        },
      ]}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {(["todos", "aprovada", "rascunho", "arquivada"] as const).map((s) => {
          const active = statusFilter === s;
          const count =
            s === "todos" ? charts.length : charts.filter((c) => c.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
                active
                  ? "border-primary/60 bg-primary/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              {s === "todos" && <Layers className="h-3 w-3" />}
              {s === "aprovada" && <CheckCircle2 className="h-3 w-3" />}
              {s === "rascunho" && <Ruler className="h-3 w-3" />}
              {s === "arquivada" && <Archive className="h-3 w-3" />}
              {s === "todos" ? "Todas" : s}
              <span className="rounded-full bg-white/10 px-1.5 text-[9px]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,340px)_1fr] gap-6 min-h-155">
        {/* Lista */}
        <div className="space-y-2 overflow-y-auto pr-2 max-h-[calc(100vh-320px)]">
          {filtered.length === 0 ? (
            <p className="text-[11px] italic text-muted-foreground">
              Nenhuma tabela para este filtro.
            </p>
          ) : (
            filtered.map((c) => {
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    active
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-primary">
                        {c.code}
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {c.category} · {c.segment} · {c.fit ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[8px] uppercase ${
                        c.status === "aprovada"
                          ? "border-emerald-400/40 text-emerald-300"
                          : c.status === "rascunho"
                            ? "border-amber-400/40 text-amber-300"
                            : "border-white/20 text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-wider">
                    <span>{c.grade.length} tamanhos</span>
                    <span>{c.linkedRefs} refs</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detalhe */}
        {selected ? (
          <Card className="glass-card border-white/10 rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-primary">
                    {selected.code}
                  </p>
                  <h2 className="text-2xl font-bold text-white mt-1">{selected.name}</h2>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {selected.category} · {selected.segment} · fit {selected.fit ?? "—"} ·{" "}
                    {selected.brand ?? "sem marca"} · atualizada em {selected.updatedAt} por{" "}
                    {selected.updatedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LocalHistoryButton
                    entityType="measurement_chart"
                    entityId={selected.id}
                    entityLabel={`${selected.code} · ${selected.name}`}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-300 hover:text-rose-200"
                    onClick={() => {
                      deleteChart(selected.id);
                      toast.error("Tabela removida");
                      setSelectedId(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selected.notes && (
                <p className="text-[11px] italic text-muted-foreground border-l-2 border-white/10 pl-3">
                  {selected.notes}
                </p>
              )}

              {/* Grade */}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-[11px]">
                  <thead className="bg-white/[0.03] uppercase tracking-widest text-[9px] text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Tamanho</th>
                      {selected.points.map((p) => (
                        <th key={p.id} className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-white">{p.code}</span>
                            <span className="text-[8px] normal-case text-muted-foreground">
                              {p.label} · ±{p.toleranceCm}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.grade.map((row) => (
                      <tr key={row.size} className="border-t border-white/5">
                        <td className="p-3 font-bold text-white">{row.size}</td>
                        {selected.points.map((p) => (
                          <td key={p.id} className="p-3 text-right tabular-nums text-muted-foreground">
                            {row.values[p.code] ?? "—"}{" "}
                            <span className="text-[9px] opacity-60">{selected.unit}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/10 text-[10px] uppercase tracking-widest"
                  onClick={() => {
                    upsertChart({
                      ...selected,
                      status: "aprovada",
                      updatedAt: new Date().toISOString().slice(0, 10),
                    });
                    toast.success("Tabela aprovada");
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/10 text-[10px] uppercase tracking-widest"
                  onClick={() => {
                    upsertChart({
                      ...selected,
                      status: "arquivada",
                      updatedAt: new Date().toISOString().slice(0, 10),
                    });
                    toast.info("Tabela arquivada");
                  }}
                >
                  <Archive className="w-3 h-3 mr-1" /> Arquivar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/10 text-[10px] uppercase tracking-widest"
                  onClick={() => {
                    const dup: MeasurementChart = {
                      ...selected,
                      id: `tm-${Date.now()}`,
                      code: `${selected.code}-CP`,
                      name: `${selected.name} (cópia)`,
                      status: "rascunho",
                      linkedRefs: 0,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    };
                    upsertChart(dup);
                    setSelectedId(dup.id);
                    toast.success("Duplicada como rascunho");
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Duplicar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-white/10 rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground text-[11px]">
              Selecione uma tabela ao lado ou crie uma nova.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tighter italic">
              Nova tabela de medidas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Código
                </Label>
                <Input
                  value={newChart.code}
                  onChange={(e) => setNewChart({ ...newChart, code: e.target.value })}
                  placeholder="TM-BLU-03"
                  className="bg-white/5 border-white/10 rounded-lg h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Nome
                </Label>
                <Input
                  value={newChart.name}
                  onChange={(e) => setNewChart({ ...newChart, name: e.target.value })}
                  placeholder="Camisas Oversized"
                  className="bg-white/5 border-white/10 rounded-lg h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Categoria
                </Label>
                <select
                  value={newChart.category}
                  onChange={(e) =>
                    setNewChart({
                      ...newChart,
                      category: e.target.value as MeasurementChart["category"],
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm"
                >
                  {["Top", "Bottom", "Dress", "Outwear", "Underwear", "Kids"].map((c) => (
                    <option key={c} value={c} className="bg-black">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Segmento
                </Label>
                <select
                  value={newChart.segment}
                  onChange={(e) =>
                    setNewChart({
                      ...newChart,
                      segment: e.target.value as MeasurementChart["segment"],
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm"
                >
                  {["Feminino", "Masculino", "Unissex", "Infantil"].map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} className="btn-primary-premium">
              Criar rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
