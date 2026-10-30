// Tabela de Medidas com Graduação Automática (Tamanho Base + Salto por POM)
// e importação direta das bibliotecas de Medidas (/measurements) e Modelos Oficiais (/official-models).
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Plus, RotateCcw, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { defaultMedidasFor, useTechSheetStore } from "@/lib/techsheet/store";
import {
  computeGradedMatrix,
  round2,
  type MeasurementPomRow,
  type TechSheetMeasurementSpec,
} from "@/lib/techsheet/textile";
import { listCharts } from "@/lib/measurements/store";

export function GradedMeasurementsPanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const doc = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const setMedidas = useTechSheetStore((s) => s.setMedidas);

  const spec: TechSheetMeasurementSpec = doc.medidas ?? defaultMedidasFor();
  const matrix = useMemo(() => computeGradedMatrix(spec), [spec]);

  const [importOpen, setImportOpen] = useState(false);
  const [gradesText, setGradesText] = useState(spec.tamanhos.join(", "));
  const [editGradesOpen, setEditGradesOpen] = useState(false);

  const charts = useMemo(() => listCharts(), []);

  const updateRow = (id: string, patch: Partial<MeasurementPomRow>) => {
    setMedidas(refAtual, {
      ...spec,
      pontos: spec.pontos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const setCellOverride = (row: MeasurementPomRow, tam: string, rawVal: string) => {
    const val = Number.parseFloat(rawVal.replace(",", "."));
    if (!Number.isFinite(val)) return;
    if (tam === spec.tamanhoBase) {
      updateRow(row.id, { valorBase: round2(val) });
      return;
    }
    updateRow(row.id, {
      overrides: { ...(row.overrides ?? {}), [tam]: round2(val) },
    });
  };

  const clearOverrides = (row: MeasurementPomRow) => {
    const next = { ...row };
    delete next.overrides;
    setMedidas(refAtual, {
      ...spec,
      pontos: spec.pontos.map((p) => (p.id === row.id ? next : p)),
    });
    toast.success(`Graduação automática restaurada para ${row.codigo} · ${row.nome}.`);
  };

  const addPomRow = () => {
    const nextLetter = String.fromCharCode(65 + (spec.pontos.length % 26));
    const nova: MeasurementPomRow = {
      id: `pom-${Date.now().toString(36)}`,
      codigo: nextLetter,
      nome: "Nova cota de medida",
      comoMedir: "Descrever referência de medição",
      valorBase: 40,
      regraGraduacaoCm: 1.5,
      toleranciaCm: 0.5,
    };
    setMedidas(refAtual, { ...spec, pontos: [...spec.pontos, nova] });
  };

  const removePomRow = (id: string) => {
    setMedidas(refAtual, {
      ...spec,
      pontos: spec.pontos.filter((p) => p.id !== id),
    });
  };

  const importFromChart = (chartId: string) => {
    const c = charts.find((x) => x.id === chartId);
    if (!c || c.grade.length === 0) return;
    const tamanhos = c.grade.map((g) => g.size);
    const midIdx = Math.floor(tamanhos.length / 2);
    const tamanhoBase = tamanhos.includes("M") ? "M" : (tamanhos[midIdx] ?? tamanhos[0]);
    const baseRow = c.grade.find((g) => g.size === tamanhoBase) ?? c.grade[0];
    const nextRow = c.grade[Math.min(c.grade.length - 1, c.grade.indexOf(baseRow) + 1)];

    const pontos: MeasurementPomRow[] = c.points.map((pt, idx) => {
      const vBase = Number(baseRow?.values[pt.code]) || 0;
      const vNext = Number(nextRow?.values[pt.code]) || vBase;
      const salto = nextRow && nextRow !== baseRow ? round2(vNext - vBase) : 2.0;
      const overrides: Record<string, number> = {};
      for (const g of c.grade) {
        if (g.values[pt.code] != null) overrides[g.size] = Number(g.values[pt.code]);
      }
      return {
        id: `pom-${pt.id}-${idx}`,
        codigo: pt.code,
        nome: pt.label,
        valorBase: vBase,
        regraGraduacaoCm: salto,
        toleranciaCm: pt.toleranceCm,
        overrides,
      };
    });

    setMedidas(refAtual, {
      tamanhoBase,
      tamanhos,
      unidade: c.unit === "in" ? "cm" : "cm",
      pontos,
      observacoesModelagem: c.notes ?? `Importada da tabela ${c.code} (${c.name})`,
    });
    setImportOpen(false);
    toast.success(`Tabela ${c.code} importada com ${pontos.length} cotas graduadas.`);
  };

  const saveGradeSizes = () => {
    const parsed = gradesText
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (parsed.length === 0) {
      toast.error("Informe ao menos 1 tamanho (ex.: PP, P, M, G, GG).");
      return;
    }
    const base = parsed.includes(spec.tamanhoBase)
      ? spec.tamanhoBase
      : parsed[Math.floor(parsed.length / 2)];
    setMedidas(refAtual, { ...spec, tamanhos: parsed, tamanhoBase: base });
    setEditGradesOpen(false);
    toast.success(`Grade atualizada: ${parsed.join(" · ")} (Base ${base}).`);
  };

  return (
    <Card id="sec-medidas" className="glass-card rounded-xl p-5 space-y-4 border-border/70">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" /> Tabela de Medidas com Graduação Automática
            <span className="text-muted-foreground font-normal">
              (Tamanho Base: <strong className="text-primary">{spec.tamanhoBase}</strong>)
            </span>
          </h3>
          {spec.observacoesModelagem && (
            <p className="text-2xs text-muted-foreground mt-0.5">{spec.observacoesModelagem}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs"
            onClick={() => {
              setGradesText(spec.tamanhos.join(", "));
              setEditGradesOpen(true);
            }}
          >
            Grade ({spec.tamanhos.join("/")})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1"
            onClick={() => setImportOpen(true)}
          >
            <Download className="w-3 h-3" /> Importar Biblioteca
          </Button>
          <Button size="sm" className="h-7 text-2xs gap-1" onClick={addPomRow}>
            <Plus className="w-3 h-3" /> Nova Cota POM
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border/70 text-2xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 px-2.5 text-left w-16">POM</th>
              <th className="py-2 px-2.5 text-left min-w-[160px]">Ponto de Medida</th>
              <th className="py-2 px-2 text-right w-24">Salto (+cm)</th>
              {spec.tamanhos.map((tam) => {
                const isBase = tam === spec.tamanhoBase;
                return (
                  <th
                    key={tam}
                    onClick={() => setMedidas(refAtual, { ...spec, tamanhoBase: tam })}
                    title="Clique para definir este tamanho como Base da graduação"
                    className={`py-2 px-2 text-center w-16 cursor-pointer select-none ${
                      isBase
                        ? "bg-primary/20 text-primary font-bold border-x border-primary/40"
                        : "hover:text-foreground"
                    }`}
                  >
                    {tam}
                  </th>
                );
              })}
              <th className="py-2 px-2 text-right w-24">Tolerância</th>
              <th className="py-2 px-2 w-14 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {matrix.map(({ row, values }) => {
              const hasOverrides = row.overrides && Object.keys(row.overrides).length > 0;
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="p-1.5">
                    <Input
                      value={row.codigo}
                      onChange={(e) => updateRow(row.id, { codigo: e.target.value.toUpperCase() })}
                      className="h-7 text-xs font-mono font-bold text-center px-1"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.nome}
                      onChange={(e) => updateRow(row.id, { nome: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      step="0.25"
                      value={row.regraGraduacaoCm}
                      onChange={(e) =>
                        updateRow(row.id, {
                          regraGraduacaoCm: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs text-right font-mono"
                    />
                  </td>
                  {spec.tamanhos.map((tam) => {
                    const isBase = tam === spec.tamanhoBase;
                    const isManual = !isBase && row.overrides?.[tam] != null;
                    return (
                      <td
                        key={tam}
                        className={`p-1 text-center ${
                          isBase ? "bg-primary/10 border-x border-primary/30" : ""
                        }`}
                      >
                        <input
                          type="number"
                          step="0.5"
                          value={values[tam] ?? 0}
                          onChange={(e) => setCellOverride(row, tam, e.target.value)}
                          className={`w-14 h-7 rounded px-1 text-center font-mono text-xs border bg-background/70 focus:outline-none focus:ring-1 focus:ring-primary ${
                            isBase
                              ? "border-primary/60 text-primary font-bold"
                              : isManual
                                ? "border-amber-500/60 text-amber-300"
                                : "border-border/60 text-foreground"
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="p-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-muted-foreground text-2xs">±</span>
                      <Input
                        type="number"
                        step="0.25"
                        value={row.toleranciaCm}
                        onChange={(e) =>
                          updateRow(row.id, {
                            toleranciaCm: Math.max(0, Number.parseFloat(e.target.value) || 0),
                          })
                        }
                        className="h-7 w-16 text-xs text-right font-mono"
                      />
                    </div>
                  </td>
                  <td className="p-1.5 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      {hasOverrides && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-amber-400"
                          title="Restaurar cálculo automático pela regra de salto"
                          onClick={() => clearOverrides(row)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removePomRow(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {matrix.length === 0 && (
              <tr>
                <td
                  colSpan={spec.tamanhos.length + 5}
                  className="py-6 text-center text-xs text-muted-foreground"
                >
                  Nenhuma cota POM cadastrada. Clique em &ldquo;Nova Cota POM&rdquo; ou importe da
                  Biblioteca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog: Importar da Biblioteca de Tabelas de Medidas */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Tabela de Medidas Padrão</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto py-2">
            {charts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => importFromChart(c.id)}
                className="w-full text-left rounded-lg border border-border/70 p-3 hover:border-primary/60 hover:bg-muted/30 transition"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-foreground">
                    {c.code} · {c.name}
                  </strong>
                  <span className="text-2xs text-primary font-mono">
                    {c.grade.map((g) => g.size).join("/")}
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  {c.segment} · {c.category} · {c.points.length} pontos de medida
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Tamanhos da Grade */}
      <Dialog open={editGradesOpen} onOpenChange={setEditGradesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Grade de Tamanhos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Tamanhos separados por vírgula</Label>
              <Input
                value={gradesText}
                onChange={(e) => setGradesText(e.target.value)}
                placeholder="PP, P, M, G, GG, XG"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Malharia (PP–GG)", val: "PP, P, M, G, GG" },
                { label: "Uniformes (P–EXG)", val: "P, M, G, GG, XG, EXG" },
                { label: "Jeans / Alfaiataria (36–46)", val: "36, 38, 40, 42, 44, 46" },
                { label: "Infantil (2–12)", val: "2, 4, 6, 8, 10, 12" },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-2xs"
                  onClick={() => setGradesText(preset.val)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGradesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveGradeSizes}>Aplicar Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
