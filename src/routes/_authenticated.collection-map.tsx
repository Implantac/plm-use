// H1-03 · Mapa de Coleção (inspirado em Coleção.Moda / Centric Line Planning).
// Visão matricial modelo × cor × grade com filtros salvos por usuário.
import { useMemo, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Grid3x3,
  Save,
  Trash2,
  Bookmark,
  DollarSign,
  Package,
  Filter,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import {
  collectionMap,
  listFilters,
  saveFilter,
  removeFilter,
  subscribeFilters,
  cellTotal,
  rowTotal,
  SIZE_GRADES,
  type MatrixCell,
  type MatrixRow,
  type SavedFilter,
} from "@/lib/collection-map/store";

export const Route = createFileRoute("/_authenticated/collection-map")({
  head: () => ({
    meta: [
      { title: "Mapa de Coleção · USE MODA PLM" },
      {
        name: "description",
        content:
          "Visão matricial da coleção — modelo × cor × grade com filtros salvos por usuário. Identifique buracos de sortimento em segundos.",
      },
      { property: "og:title", content: "Mapa de Coleção · USE MODA PLM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionMapRoute,
});

const STATUS_LABEL: Record<MatrixCell["status"], string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_DOT: Record<MatrixCell["status"], string> = {
  planejado: "bg-sky-400",
  em_producao: "bg-amber-400",
  concluido: "bg-emerald-400",
  cancelado: "bg-red-400",
};

const ALL_STATUSES: MatrixCell["status"][] = [
  "planejado",
  "em_producao",
  "concluido",
  "cancelado",
];

function CollectionMapRoute() {
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<MatrixCell["status"][]>(
    [],
  );
  const [q, setQ] = useState("");

  const filters = useSyncExternalStore(
    (l) => {
      const off = subscribeFilters(l);
      return () => off();
    },
    () => listFilters(),
    () => listFilters(),
  );

  const allCategories = useMemo(
    () => Array.from(new Set(collectionMap.rows.map((r) => r.category))),
    [],
  );
  const allColors = useMemo(() => {
    const map = new Map<string, string>();
    collectionMap.rows.forEach((r) =>
      r.cells.forEach((c) => map.set(c.colorHex, c.colorName)),
    );
    return Array.from(map.entries()); // [hex, name]
  }, []);

  const filteredRows = useMemo(() => {
    return collectionMap.rows
      .filter((r) =>
        selectedCats.length === 0 ? true : selectedCats.includes(r.category),
      )
      .filter((r) =>
        q
          ? r.refCode.toLowerCase().includes(q.toLowerCase()) ||
            r.refName.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .map((r) => ({
        ...r,
        cells: r.cells
          .filter((c) =>
            selectedColors.length === 0
              ? true
              : selectedColors.includes(c.colorHex),
          )
          .filter((c) =>
            selectedStatuses.length === 0
              ? true
              : selectedStatuses.includes(c.status),
          ),
      }))
      .filter((r) => r.cells.length > 0);
  }, [selectedCats, selectedColors, selectedStatuses, q]);

  const metrics = useMemo(() => {
    const totalRows = filteredRows.length;
    const totalUnits = filteredRows.reduce((s, r) => s + rowTotal(r), 0);
    const totalRevenue = filteredRows.reduce(
      (s, r) => s + rowTotal(r) * r.price,
      0,
    );
    const totalCost = filteredRows.reduce(
      (s, r) => s + rowTotal(r) * r.cost,
      0,
    );
    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    return [
      { label: "Modelos", value: String(totalRows), detail: "no recorte" },
      { label: "Unidades", value: totalUnits.toLocaleString("pt-BR"), detail: "planejadas" },
      {
        label: "Receita alvo",
        value: `R$ ${(totalRevenue / 1000).toFixed(0)}k`,
        detail: "PVP × qtd",
      },
      { label: "Margem", value: `${margin.toFixed(0)}%`, detail: "bruta média" },
    ];
  }, [filteredRows]);

  const clearFilters = () => {
    setSelectedCats([]);
    setSelectedColors([]);
    setSelectedStatuses([]);
    setQ("");
  };

  const applyFilter = (f: SavedFilter) => {
    setSelectedCats(f.categories);
    setSelectedColors(f.colors);
    setSelectedStatuses(f.statuses);
    toast.success(`Filtro "${f.name}" aplicado`);
  };

  return (
    <ModuleLayout
      title="Mapa de Coleção"
      subtitle="Matriz modelo × cor × grade da coleção ativa. Filtros salvos aceleram análises recorrentes (buracos de sortimento, cores fracas, categoria abaixo do target)."
      version="H1-03 · V4"
      searchPlaceholder="Buscar referência"
      metrics={metrics}
    >
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Barra de filtros */}
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Filtros
                </span>
                {(selectedCats.length + selectedColors.length + selectedStatuses.length > 0) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    limpar
                  </button>
                )}
              </div>

              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ref ou nome"
                className="h-8 text-xs"
              />

              <FilterGroup label="Categoria">
                {allCategories.map((c) => (
                  <FilterChip
                    key={c}
                    active={selectedCats.includes(c)}
                    onClick={() =>
                      setSelectedCats((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                      )
                    }
                  >
                    {c}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup label="Cor">
                <div className="flex flex-wrap gap-1.5">
                  {allColors.map(([hex, name]) => {
                    const active = selectedColors.includes(hex);
                    return (
                      <button
                        key={hex}
                        type="button"
                        title={name}
                        onClick={() =>
                          setSelectedColors((prev) =>
                            prev.includes(hex)
                              ? prev.filter((x) => x !== hex)
                              : [...prev, hex],
                          )
                        }
                        className={`h-6 w-6 rounded-full border-2 transition-all ${
                          active
                            ? "border-primary ring-2 ring-primary/40 scale-110"
                            : "border-white/20"
                        }`}
                        style={{ background: hex }}
                      />
                    );
                  })}
                </div>
              </FilterGroup>

              <FilterGroup label="Status">
                {ALL_STATUSES.map((s) => (
                  <FilterChip
                    key={s}
                    active={selectedStatuses.includes(s)}
                    onClick={() =>
                      setSelectedStatuses((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]} mr-1`} />
                    {STATUS_LABEL[s]}
                  </FilterChip>
                ))}
              </FilterGroup>

              <SaveFilterDialog
                current={{
                  categories: selectedCats,
                  colors: selectedColors,
                  statuses: selectedStatuses,
                }}
              />
            </CardContent>
          </Card>

          {/* Filtros salvos */}
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Filtros salvos
                </span>
              </div>
              {filters.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">
                  Nenhum ainda — configure e salve.
                </p>
              )}
              {filters.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] p-2"
                >
                  <button
                    type="button"
                    onClick={() => applyFilter(f)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-xs font-semibold text-white truncate">
                      {f.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      {f.categories.length + f.colors.length + f.statuses.length} critérios
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeFilter(f.id);
                      toast.success("Filtro removido");
                    }}
                    aria-label="Remover"
                    className="p-1 rounded text-muted-foreground hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Matriz */}
        <Card className="border-white/10 bg-white/[0.03] overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-white">
                {collectionMap.name}
              </h2>
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                {collectionMap.season}
              </Badge>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {filteredRows.length} modelos exibidos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-white/10">
                    <th className="text-left p-3 min-w-[220px] sticky left-0 bg-background z-10">
                      Referência
                    </th>
                    <th className="text-left p-2">Cor</th>
                    {SIZE_GRADES.map((s) => (
                      <th key={s} className="p-2 text-center w-14">
                        {s}
                      </th>
                    ))}
                    <th className="p-2 text-right w-16">Total</th>
                    <th className="p-2 text-right w-20">Receita</th>
                    <th className="p-2 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) =>
                    row.cells.map((cell, i) => (
                      <tr
                        key={`${row.refCode}-${cell.colorHex}`}
                        className="border-b border-white/5 hover:bg-white/[0.03]"
                      >
                        {i === 0 && (
                          <td
                            rowSpan={row.cells.length}
                            className="p-3 sticky left-0 bg-background/90 backdrop-blur align-top border-r border-white/5"
                          >
                            <RefCell row={row} />
                          </td>
                        )}
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-white/20 flex-shrink-0"
                              style={{ background: cell.colorHex }}
                            />
                            <span className="text-xs">{cell.colorName}</span>
                          </div>
                        </td>
                        {SIZE_GRADES.map((s) => {
                          const q = cell.grade[s];
                          return (
                            <td
                              key={s}
                              className={`p-2 text-center font-mono text-xs ${
                                q ? "text-white" : "text-muted-foreground/30"
                              }`}
                            >
                              {q ?? "—"}
                            </td>
                          );
                        })}
                        <td className="p-2 text-right font-mono text-xs font-semibold">
                          {cellTotal(cell)}
                        </td>
                        <td className="p-2 text-right font-mono text-[11px] text-emerald-300">
                          R$ {(cellTotal(cell) * row.price).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-2 text-center">
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase tracking-widest gap-1"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[cell.status]}`} />
                            {STATUS_LABEL[cell.status]}
                          </Badge>
                        </td>
                      </tr>
                    )),
                  )}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-xs text-muted-foreground"
                      >
                        Nenhuma linha bate com o filtro atual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

function RefCell({ row }: { row: MatrixRow }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="h-14 w-14 rounded overflow-hidden border border-white/10 flex-shrink-0">
        <OptimizedImage
          src={row.image}
          alt={row.refName}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono text-muted-foreground">{row.refCode}</p>
        <p className="text-xs font-semibold text-white leading-tight">{row.refName}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{row.category}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <DollarSign className="h-2.5 w-2.5" /> {row.price}
          </span>
          <span className="flex items-center gap-0.5">
            <Package className="h-2.5 w-2.5" /> {rowTotal(row)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border transition-colors ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-white/10 text-muted-foreground hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function SaveFilterDialog({
  current,
}: {
  current: {
    categories: string[];
    colors: string[];
    statuses: MatrixCell["status"][];
  };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const hasAny =
    current.categories.length + current.colors.length + current.statuses.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled={!hasAny}
        >
          <Save className="h-3.5 w-3.5" /> Salvar filtro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar filtro atual</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Tops terrosos em produção"
          />
          <p className="text-[10px] text-muted-foreground">
            {current.categories.length} categorias · {current.colors.length} cores ·{" "}
            {current.statuses.length} status
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Dê um nome ao filtro");
                return;
              }
              saveFilter({
                id: `f-${Date.now()}`,
                name: name.trim(),
                owner: "Você",
                categories: current.categories,
                colors: current.colors,
                statuses: current.statuses,
                createdAt: new Date().toISOString().slice(0, 10),
              });
              toast.success(`Filtro "${name}" salvo`);
              setName("");
              setOpen(false);
            }}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
