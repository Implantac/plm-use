// Tabela de Medidas com Graduação Automática (Tamanho Base destacado em teal,
// igual ao layout ideal de referência), colagem direta do Excel/Audaces e
// importação da biblioteca de Medidas (/measurements).
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Download,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { defaultMedidasFor, useTechSheetStore } from "@/lib/techsheet/store";
import {
  computeGradedMatrix,
  parseExcelMeasurementsPaste,
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

  const [collapsed, setCollapsed] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
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

  const handlePasteExcel = () => {
    const parsed = parseExcelMeasurementsPaste(excelText);
    if (parsed.length === 0) {
      toast.error("Nenhuma cota válida encontrada. Use TAB ou ; entre as colunas.");
      return;
    }
    setMedidas(refAtual, {
      ...spec,
      pontos: [...spec.pontos, ...parsed],
    });
    setExcelText("");
    setExcelOpen(false);
    toast.success(`${parsed.length} cota(s) POM importadas com graduação automática!`);
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
      unidade: "cm",
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
    <Card id="sec-medidas" className="glass-card rounded-xl p-4 lg:p-5 space-y-4 border-border/80">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-teal-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-teal-500" />
          )}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-foreground flex items-center gap-2">
              <Ruler className="w-4 h-4 text-teal-500" /> Tabela de Medidas com Graduação Automática
              <span className="text-muted-foreground font-normal normal-case">
                (Tamanho Base:{" "}
                <strong className="font-mono text-teal-600 dark:text-teal-300">
                  {spec.tamanhoBase}
                </strong>
                )
              </span>
            </h3>
            {!collapsed && spec.observacoesModelagem && (
              <p className="text-2xs text-muted-foreground mt-0.5">{spec.observacoesModelagem}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
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
            onClick={() => setExcelOpen(true)}
          >
            <ClipboardPaste className="w-3 h-3 text-teal-500" /> Colar Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1"
            onClick={() => setImportOpen(true)}
          >
            <Download className="w-3 h-3 text-teal-500" /> Biblioteca
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1 border-teal-500/40 hover:border-teal-500"
            onClick={addPomRow}
          >
            <Plus className="w-3 h-3 text-teal-500" /> Cota POM
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/45 border-b border-border/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-2 text-left w-16">POM</th>
                <th className="py-2 px-2 text-left min-w-[165px]">Medida / Referência</th>
                <th className="py-2 px-2 text-right w-22">Regra Δ</th>
                {spec.tamanhos.map((tam) => {
                  const isBase = tam === spec.tamanhoBase;
                  return (
                    <th
                      key={tam}
                      onClick={() => setMedidas(refAtual, { ...spec, tamanhoBase: tam })}
                      title="Clique no cabeçalho para definir este tamanho como Base da graduação"
                      className={`py-2 px-2 text-center w-16 cursor-pointer select-none transition ${
                        isBase
                          ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-extrabold border-x border-teal-500/45"
                          : "hover:text-foreground"
                      }`}
                    >
                      {tam}
                      {isBase ? " ★" : ""}
                    </th>
                  );
                })}
                <th className="py-2 px-2 text-right w-22">Tolerância</th>
                <th className="py-2 px-1 w-9" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {spec.pontos.map((row, rIdx) => {
                const gradedRow = matrix[rIdx]?.values ?? {};
                const hasOverrides = Boolean(
                  row.overrides && Object.keys(row.overrides).length > 0,
                );
                return (
                  <tr key={row.id} className="hover:bg-muted/20 align-middle">
                    <td className="p-1.5">
                      <Input
                        value={row.codigo}
                        onChange={(e) =>
                          updateRow(row.id, { codigo: e.target.value.toUpperCase() })
                        }
                        className="h-7 text-xs font-mono font-bold text-center px-1"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={row.nome}
                        onChange={(e) => updateRow(row.id, { nome: e.target.value })}
                        className="h-7 text-xs font-semibold"
                      />
                      <input
                        value={row.comoMedir ?? ""}
                        onChange={(e) => updateRow(row.id, { comoMedir: e.target.value })}
                        placeholder="Como medir (ex.: 2cm abaixo da cava)"
                        className="w-full bg-transparent text-[10px] text-muted-foreground focus:text-foreground focus:outline-none mt-0.5"
                      />
                    </td>

                    <td className="p-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                          +
                        </span>
                        <Input
                          type="number"
                          step="0.25"
                          value={row.regraGraduacaoCm}
                          onChange={(e) =>
                            updateRow(row.id, {
                              regraGraduacaoCm: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-7 w-14 text-xs text-right font-mono px-1.5"
                        />
                        {hasOverrides && (
                          <button
                            type="button"
                            onClick={() => clearOverrides(row)}
                            title="Restaurar graduação linear automática nesta linha"
                            className="p-1 rounded text-amber-500 hover:bg-amber-500/15"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {spec.tamanhos.map((tam) => {
                      const isBase = tam === spec.tamanhoBase;
                      const isOverridden = !isBase && row.overrides?.[tam] != null;
                      const val = gradedRow[tam] ?? row.valorBase;
                      return (
                        <td
                          key={tam}
                          className={`p-1.5 text-center ${
                            isBase
                              ? "bg-teal-500/12 border-x border-teal-500/35"
                              : isOverridden
                                ? "bg-amber-500/10"
                                : ""
                          }`}
                        >
                          <Input
                            type="number"
                            step="0.5"
                            value={val}
                            onChange={(e) => setCellOverride(row, tam, e.target.value)}
                            className={`h-7 text-xs text-center font-mono px-1 ${
                              isBase
                                ? "border-teal-500/50 bg-teal-500/15 text-teal-800 dark:text-teal-200 font-extrabold"
                                : isOverridden
                                  ? "border-amber-500/50 font-semibold"
                                  : ""
                            }`}
                          />
                        </td>
                      );
                    })}

                    <td className="p-1.5">
                      <div className="flex items-center justify-end gap-1 font-mono text-2xs text-muted-foreground">
                        <span>±</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={row.toleranciaCm}
                          onChange={(e) =>
                            updateRow(row.id, {
                              toleranciaCm: Math.max(0, Number.parseFloat(e.target.value) || 0),
                            })
                          }
                          className="h-7 w-13 text-xs text-right font-mono px-1.5"
                        />
                        <span>cm</span>
                      </div>
                    </td>

                    <td className="p-1 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removePomRow(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: Configurar Tamanhos da Grade */}
      <Dialog open={editGradesOpen} onOpenChange={setEditGradesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tamanhos da Grade ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">
              Tamanhos separados por vírgula (ex.: PP, P, M, G, GG, XG ou 36, 38, 40, 42, 44)
            </Label>
            <Input
              value={gradesText}
              onChange={(e) => setGradesText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGradesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveGradeSizes}>Aplicar Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Colar Medidas do Excel / Audaces */}
      <Dialog open={excelOpen} onOpenChange={setExcelOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar Tabela de Medidas do Excel / Audaces</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              Cole linhas separadas por TAB ou <code>;</code> na ordem:
              <br />
              <code className="text-2xs text-primary">
                POM | Nome da Medida | Valor Base ({spec.tamanhoBase}) | Salto (+cm) | Tolerância
              </code>
            </p>
            <Textarea
              rows={5}
              placeholder={"E\tLargura Barra\t52\t2,0\t1,0\nF\tCava Retilínea\t23\t1,0\t0,5"}
              value={excelText}
              onChange={(e) => setExcelText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcelOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasteExcel}>Importar Cotas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar da Biblioteca (/measurements) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Tabela Base da Biblioteca de Modelagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {charts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => importFromChart(c.id)}
                className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent/60 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {c.code} · {c.name}
                  </span>
                  <span className="text-2xs font-mono text-muted-foreground">
                    {c.grade.map((g) => g.size).join("/")}
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  {c.category} · {c.points.length} cotas POM cadastradas
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
