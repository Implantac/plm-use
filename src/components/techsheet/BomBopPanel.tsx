// BOM × Matriz de Cores + Conversor de Rendimento Têxtil (kg ↔ m) + Colar Excel + BOP Inline.
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
  Boxes,
  Calculator,
  ClipboardPaste,
  Clock,
  DollarSign,
  Library,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  custoTotalBOM,
  custoTotalBOP,
  defaultColorwaysFor,
  tempoTotalBOP,
  useTechSheetStore,
  type BomItem,
  type BopStep,
} from "@/lib/techsheet/store";
import { custoAplicacoesPecasTotal } from "@/lib/techsheet/aplicacoes";
import {
  bomItemCustoEfetivo,
  calcRendimentoMporKg,
  converterKgParaMetro,
  converterMetroParaKg,
  parseDecimalPtBr,
  parseExcelBomPaste,
} from "@/lib/techsheet/textile";
import { filterMaterials, useMaterials } from "@/lib/materials/store";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const BOM_TIPOS: BomItem["tipo"][] = [
  "Tecido",
  "Aviamento",
  "Linha",
  "Embalagem",
  "Bordado",
  "Silk",
];

export function BomBopPanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const data = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const addBom = useTechSheetStore((s) => s.addBomItem);
  const bulkAddBom = useTechSheetStore((s) => s.bulkAddBomItems);
  const updateBom = useTechSheetStore((s) => s.updateBomItem);
  const rmBom = useTechSheetStore((s) => s.removeBomItem);
  const addBop = useTechSheetStore((s) => s.addBopStep);
  const updateBop = useTechSheetStore((s) => s.updateBopStep);
  const rmBop = useTechSheetStore((s) => s.removeBopStep);
  const materials = useMaterials();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQ, setCatalogQ] = useState("");
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [yieldItem, setYieldItem] = useState<BomItem | null>(null);
  const [cwEdit, setCwEdit] = useState<{ item: BomItem; cwId: string; cwName: string } | null>(
    null,
  );
  const [cwColorText, setCwColorText] = useState("");

  const colorways = data.colorways?.length ? data.colorways : defaultColorwaysFor();

  const totals = useMemo(() => {
    const bom = custoTotalBOM(data.bom);
    const bopTempo = tempoTotalBOP(data.bop);
    const bopCusto = custoTotalBOP(data.bop);
    const apps = custoAplicacoesPecasTotal(data.aplicacoes ?? []);
    return {
      bom,
      bopTempo,
      bopCusto,
      apps,
      industrial: Math.round((bom + bopCusto + apps) * 100) / 100,
    };
  }, [data]);

  const handlePasteExcel = () => {
    const parsed = parseExcelBomPaste(excelText);
    if (parsed.length === 0) {
      toast.error(
        "Nenhuma linha válida identificada. Use colunas separadas por TAB ou ponto-e-vírgula.",
      );
      return;
    }
    bulkAddBom(refAtual, parsed);
    setExcelText("");
    setExcelOpen(false);
    toast.success(`${parsed.length} insumo(s) importados da planilha para o BOM.`);
  };

  const addBlankBomRow = () => {
    addBom(refAtual, {
      tipo: "Aviamento",
      material: "Novo insumo técnico",
      fornecedor: "A definir",
      consumo: "1",
      unidade: "un",
      perdaPct: 2,
      custoUnitario: 1.5,
      custo: 1.53,
    });
  };

  const addBlankBopStep = () => {
    const nextSeq = (data.bop.reduce((m, s) => Math.max(m, s.seq), 0) || 0) + 1;
    addBop(refAtual, {
      seq: nextSeq,
      etapa: "Nova operação de costura",
      setor: "Costura",
      maquina: "Reta Industrial",
      tempoMin: 2.5,
      custo: 1.8,
    });
  };

  return (
    <Card id="sec-bom" className="glass-card rounded-xl p-5 space-y-6 border-border/70">
      {/* Cabeçalho + KPIs + Ações Rápidas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary" /> BOM × Matriz de Cores &amp; Roteiro (BOP)
            · <span className="text-primary">{refAtual}</span>
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Edição direta em grade · Custo da linha recalcula por{" "}
            <code>Consumo × (1 + Perda%) × Custo Unit.</code>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatBadge icon={<Boxes className="w-3 h-3" />} label="MP" value={brl(totals.bom)} />
          <StatBadge
            icon={<Clock className="w-3 h-3" />}
            label="Tempo"
            value={`${totals.bopTempo} min`}
          />
          <StatBadge
            icon={<DollarSign className="w-3 h-3" />}
            label="Custo Ind."
            value={brl(totals.industrial)}
            accent
          />
        </div>
      </div>

      {/* Barra de Ferramentas do BOM */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1.5"
            onClick={() => setCatalogOpen(true)}
          >
            <Library className="w-3.5 h-3.5 text-primary" /> + Insumo da Biblioteca
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1.5"
            onClick={() => setExcelOpen(true)}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-primary" /> Colar Excel
          </Button>
          <Button size="sm" className="h-7 text-2xs gap-1" onClick={addBlankBomRow}>
            <Plus className="w-3.5 h-3.5" /> Linha BOM
          </Button>
        </div>
        <span className="text-2xs text-muted-foreground">
          {colorways.length} variante(s) ativa(s) na matriz cromática
        </span>
      </div>

      {/* Grade Fluida BOM × Matriz de Cores */}
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border/70 text-2xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 px-2 text-left w-24">Tipo</th>
              <th className="py-2 px-2 text-left min-w-[180px]">Material / Fornecedor</th>
              <th className="py-2 px-1.5 text-right w-20">Consumo</th>
              <th className="py-2 px-1.5 text-center w-14">Un.</th>
              <th className="py-2 px-1.5 text-right w-16">Perda %</th>
              <th className="py-2 px-1.5 text-center w-24">Rend. Malha</th>
              <th className="py-2 px-1.5 text-right w-24">Unit. (R$)</th>
              <th className="py-2 px-2 text-right w-24">Custo Linha</th>
              <th className="py-2 px-2 text-center min-w-[96px]">Matriz Cores</th>
              <th className="py-2 px-2 text-right w-24">Saldo Almox.</th>
              <th className="py-2 px-1.5 w-9" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.bom.map((b) => {
              const rend = calcRendimentoMporKg(b.larguraM, b.gramaturaGm2);
              const custoLinha = bomItemCustoEfetivo(b);
              return (
                <tr key={b.id} className="hover:bg-muted/20 align-middle">
                  <td className="p-1.5">
                    <select
                      value={b.tipo}
                      onChange={(e) =>
                        updateBom(refAtual, b.id, { tipo: e.target.value as BomItem["tipo"] })
                      }
                      className="h-7 w-full rounded border border-border/60 bg-background/80 px-1.5 text-2xs font-medium"
                    >
                      {BOM_TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5 space-y-1">
                    <Input
                      value={b.material}
                      onChange={(e) => updateBom(refAtual, b.id, { material: e.target.value })}
                      className="h-7 text-xs font-medium"
                    />
                    <Input
                      value={b.fornecedor}
                      onChange={(e) => updateBom(refAtual, b.id, { fornecedor: e.target.value })}
                      placeholder="Fornecedor"
                      className="h-6 text-[11px] text-muted-foreground"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={b.consumo}
                      onChange={(e) => updateBom(refAtual, b.id, { consumo: e.target.value })}
                      className="h-7 text-xs text-right font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={b.unidade}
                      onChange={(e) => updateBom(refAtual, b.id, { unidade: e.target.value })}
                      className="h-7 text-xs text-center font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      value={b.perdaPct ?? 0}
                      onChange={(e) =>
                        updateBom(refAtual, b.id, {
                          perdaPct: Math.max(0, Number.parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-7 text-xs text-right font-mono"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setYieldItem(b)}
                      title="Abrir calculadora de rendimento têxtil (largura × gramatura)"
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/60 px-2 py-1 text-2xs font-mono hover:border-primary/60"
                    >
                      <Calculator className="w-3 h-3 text-primary" />
                      {rend > 0 ? `${rend.toFixed(2)} m/kg` : "Calc."}
                    </button>
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      value={b.custoUnitario ?? b.custo}
                      onChange={(e) => {
                        const val = Math.max(0, Number.parseFloat(e.target.value) || 0);
                        updateBom(refAtual, b.id, { custoUnitario: val });
                      }}
                      className="h-7 text-xs text-right font-mono"
                    />
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold text-foreground">
                    {brl(custoLinha)}
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {colorways.map((cw) => {
                        const specCor = b.variantesCor?.[cw.id] ?? `${cw.hex} · ${cw.name}`;
                        const hexMatch = specCor.match(/#[0-9a-fA-F]{6}/)?.[0] ?? cw.hex;
                        return (
                          <button
                            key={cw.id}
                            type="button"
                            title={`${cw.code}: ${specCor} (clique para especificar cor do insumo)`}
                            onClick={() => {
                              setCwEdit({ item: b, cwId: cw.id, cwName: cw.name });
                              setCwColorText(specCor);
                            }}
                            className="w-4 h-4 rounded-full border border-white/40 hover:scale-125 transition"
                            style={{ backgroundColor: hexMatch }}
                          />
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-1.5 text-right font-mono text-2xs">
                    {b.estoqueDisponivel != null ? (
                      <span className="text-emerald-400">
                        {b.estoqueDisponivel.toLocaleString("pt-BR")} {b.unidade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-1 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => rmBom(refAtual, b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {data.bom.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum material no BOM. Adicione da Biblioteca ou cole direto do Excel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Roteiro Operacional de Costura (BOP) Inline */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Roteiro de Costura &amp; Operações (BOP)
            </h4>
            <p className="text-2xs text-muted-foreground">
              Sequência operacional enviada para cronoanálise, facção e formação do minuto-costura.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1"
            onClick={addBlankBopStep}
          >
            <Plus className="w-3 h-3" /> Nova Operação
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70 text-2xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-2 text-center w-14">Seq</th>
                <th className="py-2 px-2 text-left min-w-[180px]">Operação / Etapa</th>
                <th className="py-2 px-2 text-left w-32">Setor</th>
                <th className="py-2 px-2 text-left w-40">Máquina / Recurso</th>
                <th className="py-2 px-2 text-right w-24">Tempo (min)</th>
                <th className="py-2 px-2 text-right w-24">Custo (R$)</th>
                <th className="py-2 px-1.5 w-9" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...data.bop]
                .sort((a, b) => a.seq - b.seq)
                .map((s: BopStep) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="p-1.5">
                      <Input
                        type="number"
                        value={s.seq}
                        onChange={(e) =>
                          updateBop(refAtual, s.id, {
                            seq: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="h-7 text-xs text-center font-mono"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={s.etapa}
                        onChange={(e) => updateBop(refAtual, s.id, { etapa: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={s.setor}
                        onChange={(e) => updateBop(refAtual, s.id, { setor: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={s.maquina ?? ""}
                        placeholder="Ex.: Overloque 4 fios"
                        onChange={(e) => updateBop(refAtual, s.id, { maquina: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        value={s.tempoMin}
                        onChange={(e) =>
                          updateBop(refAtual, s.id, {
                            tempoMin: Math.max(0, Number.parseFloat(e.target.value) || 0),
                          })
                        }
                        className="h-7 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.05"
                        value={s.custo}
                        onChange={(e) =>
                          updateBop(refAtual, s.id, {
                            custo: Math.max(0, Number.parseFloat(e.target.value) || 0),
                          })
                        }
                        className="h-7 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => rmBop(refAtual, s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Biblioteca de Materiais */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Inserir da Biblioteca de Materiais — {refAtual}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Buscar por nome, SKU ou fornecedor…"
            value={catalogQ}
            onChange={(e) => setCatalogQ(e.target.value)}
          />
          <div className="mt-2 max-h-[50vh] space-y-2 overflow-y-auto">
            {filterMaterials(materials, catalogQ).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nada encontrado — cadastre em PLM · Engenharia · Materiais.
              </p>
            )}
            {filterMaterials(materials, catalogQ).map((m) => (
              <button
                key={m.id}
                type="button"
                className="block w-full rounded-md border border-border px-3 py-2 text-left hover:bg-accent/60"
                onClick={() => {
                  addBom(refAtual, {
                    tipo: m.tipo,
                    material: m.name,
                    fornecedor: m.supplier || "—",
                    consumo: "1",
                    unidade: m.unit,
                    perdaPct: m.tipo === "Tecido" ? 5 : 2,
                    custoUnitario: m.unitCost,
                    custo: m.unitCost,
                    skuErp: m.sku,
                  });
                  toast.success(`${m.name} inserido no BOM com cálculo automático de consumo.`);
                  setCatalogOpen(false);
                  setCatalogQ("");
                }}
              >
                <span className="text-xs font-semibold text-foreground">{m.name}</span>
                <span className="ml-2 text-2xs uppercase tracking-wide text-muted-foreground">
                  {m.tipo} · {m.supplier || "—"} · {brl(m.unitCost)}/{m.unit}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Colar do Excel */}
      <Dialog open={excelOpen} onOpenChange={setExcelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar Estrutura de Materiais do Excel / Planilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              Copie as células da planilha na ordem:{" "}
              <code>Tipo | Material | Fornecedor | Consumo | Unidade | Perda% | CustoUnit</code>
            </p>
            <Textarea
              rows={6}
              placeholder={
                "Tecido\tMalha Dry Fit UV50\tTêxtil Camargo\t0,260\tkg\t7\t39,80\nAviamento\tTransfer Peito\tReal\t1\tun\t2\t2,30"
              }
              value={excelText}
              onChange={(e) => setExcelText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcelOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasteExcel}>Importar Linhas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Calculadora de Rendimento Têxtil (kg ↔ m) */}
      <Dialog open={!!yieldItem} onOpenChange={(o) => !o && setYieldItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conversor de Rendimento Têxtil — {yieldItem?.material}</DialogTitle>
          </DialogHeader>
          {yieldItem && (
            <YieldCalculatorBody
              item={yieldItem}
              onApply={(patch) => {
                updateBom(refAtual, yieldItem.id, patch);
                setYieldItem(null);
                toast.success("Rendimento e consumo atualizados na linha do BOM.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cor do Insumo na Variante (Colorway) */}
      <Dialog open={!!cwEdit} onOpenChange={(o) => !o && setCwEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cor do Insumo na Variante {cwEdit?.cwName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">{cwEdit?.item.material}</Label>
            <Input
              placeholder="#1D6B47 · Verde Bandeira Pantone 19-6050"
              value={cwColorText}
              onChange={(e) => setCwColorText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCwEdit(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!cwEdit) return;
                updateBom(refAtual, cwEdit.item.id, {
                  variantesCor: {
                    ...(cwEdit.item.variantesCor ?? {}),
                    [cwEdit.cwId]: cwColorText,
                  },
                });
                setCwEdit(null);
                toast.success("Matriz de cor do insumo atualizada.");
              }}
            >
              Salvar Cor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatBadge({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-2xs font-semibold ${
        accent
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/70 bg-muted/30 text-foreground"
      }`}
    >
      {icon}
      <span className="text-muted-foreground uppercase">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function YieldCalculatorBody({
  item,
  onApply,
}: {
  item: BomItem;
  onApply: (patch: Partial<BomItem>) => void;
}) {
  const [largura, setLargura] = useState(item.larguraM ?? 1.8);
  const [gramatura, setGramatura] = useState(item.gramaturaGm2 ?? 135);
  const [consumoM, setConsumoM] = useState(() => {
    const cur = parseDecimalPtBr(item.consumo);
    return item.unidade === "kg"
      ? converterKgParaMetro(cur, item.larguraM ?? 1.8, item.gramaturaGm2 ?? 135) || 1.05
      : cur || 1.05;
  });

  const rend = calcRendimentoMporKg(largura, gramatura);
  const pesoKg = converterMetroParaKg(consumoM, largura, gramatura);

  return (
    <div className="space-y-3 py-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Largura Útil (m)</Label>
          <Input
            type="number"
            step="0.01"
            value={largura}
            onChange={(e) => setLargura(Number.parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Gramatura (g/m²)</Label>
          <Input
            type="number"
            step="1"
            value={gramatura}
            onChange={(e) => setGramatura(Number.parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Consumo Linear no Risco CAD (m/peça)</Label>
        <Input
          type="number"
          step="0.01"
          value={consumoM}
          onChange={(e) => setConsumoM(Number.parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rendimento calculado:</span>
          <strong className="font-mono text-primary">{rend.toFixed(3)} m/kg</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Consumo equivalente em peso:</span>
          <strong className="font-mono text-foreground">{pesoKg.toFixed(4)} kg/peça</strong>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onApply({
              larguraM: largura,
              gramaturaGm2: gramatura,
              consumo: String(consumoM),
              unidade: "m",
            })
          }
        >
          Usar em Metros ({consumoM} m)
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onApply({
              larguraM: largura,
              gramaturaGm2: gramatura,
              consumo: String(pesoKg),
              unidade: "kg",
            })
          }
        >
          Converter p/ Quilos ({pesoKg} kg)
        </Button>
      </div>
    </div>
  );
}
