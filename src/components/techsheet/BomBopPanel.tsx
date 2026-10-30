// BOM × Matriz de Cores (colunas dedicadas por Variante, igual à tela ideal)
// + Kit Aviamentos 1-clique + Rendimento de Malha (kg ↔ m) + Saldo Almoxarifado
// com cobertura em peças + Roteiro Operacional de Costura (BOP) colapsável.
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
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Clock,
  DollarSign,
  Library,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  custoTotalBOM,
  custoTotalBOP,
  defaultColorwaysFor,
  defaultEncaixeCadFor,
  tempoTotalBOP,
  useTechSheetStore,
  type BomItem,
  type BopStep,
} from "@/lib/techsheet/store";
import { custoAplicacoesPecasTotal } from "@/lib/techsheet/aplicacoes";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import {
  bomItemCustoEfetivo,
  calcRendimentoMporKg,
  converterKgParaMetro,
  converterMetroParaKg,
  parseDecimalPtBr,
  parseExcelBomPaste,
} from "@/lib/techsheet/textile";
import { filterMaterials, useMaterials } from "@/lib/materials/store";
import { useStockItems } from "@/hooks/use-stock";

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

export interface BomBopPanelProps {
  refAtual: string;
  mode?: "both" | "bom-only" | "bop-only";
}

export function BomBopPanel({ refAtual, mode = "both" }: BomBopPanelProps) {
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
  const { items: stockItems, balances: stockBalances } = useStockItems();

  const [bomCollapsed, setBomCollapsed] = useState(false);
  const [bopCollapsed, setBopCollapsed] = useState(false);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQ, setCatalogQ] = useState("");
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [yieldItem, setYieldItem] = useState<BomItem | null>(null);
  const [cwEdit, setCwEdit] = useState<{ item: BomItem; cwId: string; cwName: string } | null>(
    null,
  );
  const [cwColorText, setCwColorText] = useState("");
  const [stockEdit, setStockEdit] = useState<{ item: BomItem; val: string } | null>(null);

  const colorways = data.colorways?.length ? data.colorways : defaultColorwaysFor();
  const cad = data.encaixeCad ?? defaultEncaixeCadFor();

  // Resolve saldo de almoxarifado priorizando stock_balance real do banco (quando existir)
  const resolveAvailableStock = (b: BomItem): number | null => {
    if (stockItems.length > 0) {
      const needle = b.material.toLowerCase();
      const skuNeedle = (b.skuErp ?? b.lote ?? "").toLowerCase();
      const found = stockItems.find(
        (it) =>
          (skuNeedle && it.code.toLowerCase() === skuNeedle) || it.name.toLowerCase() === needle,
      );
      if (found) {
        const bal = stockBalances[found.id];
        if (bal) return Math.max(0, Number(bal.qty_on_hand || 0) - Number(bal.qty_reserved || 0));
      }
    }
    return b.estoqueDisponivel != null ? b.estoqueDisponivel : null;
  };

  const totals = useMemo(() => {
    const bom = custoTotalBOM(data.bom);
    const bopTempo = tempoTotalBOP(data.bop);
    const bopCusto = custoTotalBOP(data.bop);
    const apps = custoAplicacoesPecasTotal(data.aplicacoes ?? []);
    const avgPerda =
      data.bom.length > 0
        ? data.bom.reduce((acc, b) => acc + (Number(b.perdaPct) || 0), 0) / data.bom.length
        : 0;

    let minCoveragePieces: number | null = null;
    for (const b of data.bom) {
      const avail = b.estoqueDisponivel;
      const cons = parseDecimalPtBr(b.consumo) * (1 + (Number(b.perdaPct) || 0) / 100);
      if (avail != null && cons > 0) {
        const pcs = Math.floor(avail / cons);
        if (minCoveragePieces === null || pcs < minCoveragePieces) minCoveragePieces = pcs;
      }
    }

    const fullPricing = computeFullTechSheetPricing(data);
    return {
      bom,
      bopTempo,
      bopCusto,
      apps,
      avgPerda,
      minCoveragePieces,
      industrial: fullPricing.industrial,
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
      tipo: "Tecido",
      material: "Novo insumo técnico",
      fornecedor: "A definir",
      consumo: "0.20",
      unidade: "kg",
      perdaPct: 5,
      custoUnitario: 38.0,
      custo: 7.98,
      estoqueDisponivel: 500,
    });
  };

  const addTrimKit = () => {
    bulkAddBom(refAtual, [
      {
        tipo: "Aviamento",
        material: "Etiqueta Composição Cetim ABNT Dupla Face",
        fornecedor: "Haco Etiquetas",
        consumo: "1",
        unidade: "un",
        perdaPct: 2,
        custoUnitario: 0.38,
        custo: 0.39,
        estoqueDisponivel: 4200,
      },
      {
        tipo: "Aviamento",
        material: "Tag Cartão Couché 300g + Pino Fixador",
        fornecedor: "Gráfica Têxtil Sul",
        consumo: "1",
        unidade: "un",
        perdaPct: 1,
        custoUnitario: 0.65,
        custo: 0.66,
        estoqueDisponivel: 3100,
      },
      {
        tipo: "Embalagem",
        material: "Saco PP Transparente Autocolante 30×40cm",
        fornecedor: "EmbalaPlus",
        consumo: "1",
        unidade: "un",
        perdaPct: 1,
        custoUnitario: 0.42,
        custo: 0.42,
        estoqueDisponivel: 9500,
      },
    ]);
    toast.success("Kit padrão de Aviamentos & Embalagem (3 itens) inserido no BOM!");
  };

  const addBlankBopStep = () => {
    const nextSeq = (data.bop.reduce((m, s) => Math.max(m, s.seq), 0) || 0) + 1;
    addBop(refAtual, {
      seq: nextSeq,
      etapa: "Nova operação de costura",
      setor: "Costura",
      maquina: "Reta Eletrônica",
      tempoMin: 2.5,
      custo: 1.8,
    });
  };

  const showBom = mode === "both" || mode === "bom-only";
  const showBop = mode === "both" || mode === "bop-only";

  return (
    <div className="space-y-4">
      {/* CARD 1: BOM × MATRIZ DE CORES + SALDO ALMOXARIFADO */}
      {showBom && (
        <Card id="sec-bom" className="glass-card rounded-xl p-4 lg:p-5 space-y-4 border-border/80">
          {/* Cabeçalho Colapsável + KPIs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBomCollapsed((v) => !v)}
              className="flex items-center gap-2 text-left group"
            >
              {bomCollapsed ? (
                <ChevronRight className="w-4 h-4 text-teal-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-teal-500" />
              )}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-foreground flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-teal-500" /> BOM × Matriz de Cores
                  <span className="rounded bg-teal-500/15 border border-teal-500/35 px-1.5 py-0.5 text-[10px] font-mono text-teal-700 dark:text-teal-300">
                    {data.bom.length} itens
                  </span>
                </h3>
              </div>
            </button>

            <div className="flex items-center gap-1.5 flex-wrap">
              <StatBadge icon={<Boxes className="w-3 h-3" />} label="MP" value={brl(totals.bom)} />
              <StatBadge
                icon={<Clock className="w-3 h-3" />}
                label="SAM"
                value={`${totals.bopTempo.toFixed(1)} min`}
              />
              <StatBadge
                icon={<DollarSign className="w-3 h-3" />}
                label="Custo Ind."
                value={brl(totals.industrial)}
                accent
              />
            </div>
          </div>

          {!bomCollapsed && (
            <>
              {/* Barra de Ferramentas Rápidas (idêntica à tela ideal) */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1 border-teal-500/40 hover:border-teal-500"
                    onClick={addBlankBomRow}
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-500" /> Insumo Rápido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1"
                    onClick={addTrimKit}
                    title="Insere Etiqueta ABNT + Tag + Embalagem PP em 1 clique"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-500" /> + Kit Aviamentos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1"
                    onClick={() => setCatalogOpen(true)}
                  >
                    <Library className="w-3.5 h-3.5 text-teal-500" /> Biblioteca
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1"
                    onClick={() => setExcelOpen(true)}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-teal-500" /> Colar Excel
                  </Button>
                </div>

                <span className="text-2xs text-muted-foreground font-mono">
                  Consumo × (1 + Perda%) × Unit.
                </span>
              </div>

              {/* Tabela Industrial BOM × Variantes × Saldo Almoxarifado */}
              <div className="overflow-x-auto rounded-lg border border-border/80">
                <table className="w-full min-w-[920px] text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/45 border-b border-border/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 px-2 text-left w-26">Tipo</th>
                      <th className="py-2 px-2 text-left min-w-[185px]">Material</th>
                      <th className="py-2 px-1.5 text-right w-28">Consumo</th>
                      <th className="py-2 px-1.5 text-right w-20">Perda</th>
                      <th className="py-2 px-1.5 text-center w-22">Rend.</th>
                      <th className="py-2 px-1.5 text-right w-24">Unitário</th>
                      {colorways.slice(0, 4).map((cw) => (
                        <th
                          key={cw.id}
                          className="py-2 px-1.5 text-center w-16"
                          title={`Variante: ${cw.name} (${cw.code})`}
                        >
                          Var {cw.code.split("-")[0]}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-right w-22">Custo/pç</th>
                      <th className="py-2 px-2 text-right w-28">Saldo Almox.</th>
                      <th className="py-2 px-1 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.bom.map((b) => {
                      const rend = calcRendimentoMporKg(b.larguraM, b.gramaturaGm2);
                      const custoLinha = bomItemCustoEfetivo(b);
                      const avail = resolveAvailableStock(b);
                      const consEfetivo =
                        parseDecimalPtBr(b.consumo) * (1 + (Number(b.perdaPct) || 0) / 100);
                      const coveragePcs =
                        avail != null && consEfetivo > 0 ? Math.floor(avail / consEfetivo) : null;

                      return (
                        <tr key={b.id} className="hover:bg-muted/20 align-middle">
                          <td className="p-1.5">
                            <select
                              value={b.tipo}
                              onChange={(e) =>
                                updateBom(refAtual, b.id, {
                                  tipo: e.target.value as BomItem["tipo"],
                                })
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

                          <td className="p-1.5">
                            <Input
                              value={b.material}
                              onChange={(e) =>
                                updateBom(refAtual, b.id, { material: e.target.value })
                              }
                              className="h-7 text-xs font-semibold"
                            />
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                value={b.fornecedor}
                                onChange={(e) =>
                                  updateBom(refAtual, b.id, { fornecedor: e.target.value })
                                }
                                placeholder="Fornecedor"
                                className="w-full bg-transparent text-[10px] text-muted-foreground focus:text-foreground focus:outline-none"
                              />
                            </div>
                          </td>

                          <td className="p-1.5">
                            <div className="flex items-center gap-1">
                              <Input
                                value={b.consumo}
                                onChange={(e) =>
                                  updateBom(refAtual, b.id, { consumo: e.target.value })
                                }
                                className="h-7 text-xs text-right font-mono px-1.5"
                              />
                              <input
                                value={b.unidade}
                                onChange={(e) =>
                                  updateBom(refAtual, b.id, { unidade: e.target.value })
                                }
                                aria-label="Unidade"
                                className="w-8 h-7 rounded border border-border/50 bg-muted/30 text-center font-mono text-[10px] text-muted-foreground focus:outline-none"
                              />
                            </div>
                          </td>

                          <td className="p-1.5">
                            <div className="relative flex items-center">
                              <Input
                                type="number"
                                step="0.5"
                                value={b.perdaPct ?? 0}
                                onChange={(e) =>
                                  updateBom(refAtual, b.id, {
                                    perdaPct: Math.max(0, Number.parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="h-7 text-xs text-right font-mono pr-4 pl-1"
                              />
                              <span className="absolute right-1.5 text-[10px] text-muted-foreground pointer-events-none">
                                %
                              </span>
                            </div>
                          </td>

                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setYieldItem(b)}
                              title="Calculadora de rendimento têxtil (Largura × Gramatura)"
                              className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/60 px-1.5 py-1 text-[11px] font-mono hover:border-teal-500/70 transition"
                            >
                              {rend > 0 ? (
                                <span className="text-foreground">{rend.toFixed(2)} m/kg</span>
                              ) : (
                                <span className="text-muted-foreground inline-flex items-center gap-0.5">
                                  <Calculator className="w-3 h-3 text-teal-500" /> --
                                </span>
                              )}
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
                              className="h-7 text-xs text-right font-mono px-1.5"
                            />
                          </td>

                          {/* Colunas dedicadas por Variante Cromática (bolinhas coloridas como no print ideal) */}
                          {colorways.slice(0, 4).map((cw) => {
                            const specCor = b.variantesCor?.[cw.id] ?? `${cw.hex} · ${cw.name}`;
                            const hexMatch = specCor.match(/#[0-9a-fA-F]{6}/)?.[0] ?? cw.hex;
                            return (
                              <td key={cw.id} className="p-1.5 text-center">
                                <button
                                  type="button"
                                  title={`${cw.code} (${cw.name}): ${specCor} — clique p/ editar cor do insumo`}
                                  onClick={() => {
                                    setCwEdit({ item: b, cwId: cw.id, cwName: cw.name });
                                    setCwColorText(specCor);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 hover:border-teal-500 transition"
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/50 shadow-2xs"
                                    style={{ backgroundColor: hexMatch }}
                                  />
                                  {cw.secondaryHex && b.tipo === "Tecido" && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-white/40 opacity-85"
                                      style={{ backgroundColor: cw.secondaryHex }}
                                    />
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          <td className="p-1.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                            {brl(custoLinha)}
                          </td>

                          {/* Saldo Almoxarifado clicável + cobertura estimada em peças */}
                          <td className="p-1.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setStockEdit({
                                  item: b,
                                  val: avail != null ? String(avail) : "",
                                })
                              }
                              title={
                                coveragePcs != null
                                  ? `Saldo cobre aprox. ${coveragePcs.toLocaleString("pt-BR")} peças — clique p/ ajustar saldo de referência`
                                  : "Clique para informar saldo disponível no almoxarifado"
                              }
                              className="inline-flex items-center justify-end gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted/60 transition whitespace-nowrap"
                            >
                              {avail != null ? (
                                <>
                                  <Package
                                    className={`w-3 h-3 ${
                                      avail > 0 ? "text-teal-500" : "text-amber-500"
                                    }`}
                                  />
                                  <span
                                    className={
                                      avail > 0
                                        ? "text-foreground font-medium"
                                        : "text-amber-600 dark:text-amber-400"
                                    }
                                  >
                                    {avail.toLocaleString("pt-BR")} {b.unidade}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">+ Saldo</span>
                              )}
                            </button>
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
                        <td
                          colSpan={8 + Math.min(4, colorways.length)}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          Nenhum material no BOM. Use + Insumo Rápido, + Kit Aviamentos ou Colar
                          Excel.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé Analítico do BOM (idêntico à barra inferior do card no modelo ideal) */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-2xs text-muted-foreground">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    Aproveitamento CAD:{" "}
                    <strong className="font-mono text-teal-600 dark:text-teal-400">
                      {cad.eficienciaPct.toFixed(1)}%
                    </strong>
                  </span>
                  <span>
                    Quebra Média:{" "}
                    <strong className="font-mono text-foreground">
                      {totals.avgPerda.toFixed(1)}%
                    </strong>
                  </span>
                  {totals.minCoveragePieces != null && (
                    <span>
                      Capacidade c/ Estoque Atual:{" "}
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                        ~{totals.minCoveragePieces.toLocaleString("pt-BR")} pçs
                      </strong>
                    </span>
                  )}
                </div>
                <span className="font-mono font-semibold text-foreground">
                  Total MP: {brl(totals.bom)}/pç
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* CARD 2: ROTEIRO DE COSTURA & OPERAÇÕES (BOP) */}
      {showBop && (
        <Card
          id="sec-roteiro"
          className="glass-card rounded-xl p-4 lg:p-5 space-y-3 border-border/80"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBopCollapsed((v) => !v)}
              className="flex items-center gap-2 text-left"
            >
              {bopCollapsed ? (
                <ChevronRight className="w-4 h-4 text-teal-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-teal-500" />
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" /> Roteiro de Costura &amp; Operações
                  (BOP)
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    SAM {totals.bopTempo.toFixed(1)} min · {brl(totals.bopCusto)}
                  </span>
                </h4>
              </div>
            </button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-2xs gap-1"
              onClick={addBlankBopStep}
            >
              <Plus className="w-3 h-3 text-teal-500" /> Nova Operação
            </Button>
          </div>

          {!bopCollapsed && (
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/45 border-b border-border/80 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 px-2 text-center w-14">Seq</th>
                    <th className="py-2 px-2 text-left min-w-[180px]">Operação / Etapa</th>
                    <th className="py-2 px-2 text-left w-32">Setor</th>
                    <th className="py-2 px-2 text-left w-44">Máquina / Recurso</th>
                    <th className="py-2 px-2 text-right w-24">SAM (min)</th>
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
                            className="h-7 w-11 px-1 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={s.etapa}
                            onChange={(e) => updateBop(refAtual, s.id, { etapa: e.target.value })}
                            className="h-7 text-xs font-medium"
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
          )}
        </Card>
      )}

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
                  toast.success(`${m.name} inserido no BOM.`);
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
              Copie as linhas do Excel (colunas separadas por TAB ou <code>;</code>) na ordem:
              <br />
              <code className="text-2xs text-primary">
                Tipo | Material | Fornecedor | Consumo | Unidade | Perda% | CustoUnitario
              </code>
            </p>
            <Textarea
              rows={6}
              placeholder={
                "Tecido\tMalha Algodão 30.1\tMenegotti\t0,24\tkg\t6\t42,90\nAviamento\tEtiqueta Cetim\tHaco\t1\tun\t2\t0,45"
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
      <Dialog open={Boolean(yieldItem)} onOpenChange={(o) => !o && setYieldItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rendimento Têxtil (Malharia kg ↔ m)</DialogTitle>
          </DialogHeader>
          {yieldItem && (
            <YieldCalculatorBody
              item={yieldItem}
              onApply={(patch) => {
                updateBom(refAtual, yieldItem.id, patch);
                setYieldItem(null);
                toast.success("Largura, gramatura e rendimento aplicados ao insumo.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cor do Insumo na Variante */}
      <Dialog open={Boolean(cwEdit)} onOpenChange={(o) => !o && setCwEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cor do Insumo na Variante {cwEdit?.cwName} ({cwEdit?.item.material})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Código / HEX + Nome da Cor do Insumo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cwColorText.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#1D6B47"}
                onChange={(e) => {
                  const rest = cwColorText.replace(/#[0-9a-fA-F]{6}\s*·?\s*/, "").trim();
                  setCwColorText(`${e.target.value} · ${rest || cwEdit?.cwName || "Cor"}`);
                }}
                className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={cwColorText}
                onChange={(e) => setCwColorText(e.target.value)}
                placeholder="#1D6B47 · Verde Bandeira Lote 42"
                className="font-mono text-xs flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCwEdit(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!cwEdit) return;
                const nextMap = {
                  ...(cwEdit.item.variantesCor ?? {}),
                  [cwEdit.cwId]: cwColorText,
                };
                updateBom(refAtual, cwEdit.item.id, { variantesCor: nextMap });
                setCwEdit(null);
                toast.success("Matriz de cor do insumo atualizada.");
              }}
            >
              Salvar Cor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Saldo de Almoxarifado de Referência */}
      <Dialog open={Boolean(stockEdit)} onOpenChange={(o) => !o && setStockEdit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Saldo Disponível no Almoxarifado</DialogTitle>
          </DialogHeader>
          {stockEdit && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">{stockEdit.item.material}</p>
              <div>
                <Label className="text-xs">Quantidade Disponível ({stockEdit.item.unidade})</Label>
                <Input
                  type="number"
                  step="1"
                  value={stockEdit.val}
                  onChange={(e) => setStockEdit({ ...stockEdit, val: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStockEdit(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const num = Number.parseFloat(stockEdit.val);
                    updateBom(refAtual, stockEdit.item.id, {
                      estoqueDisponivel: Number.isFinite(num) && num >= 0 ? num : undefined,
                    });
                    setStockEdit(null);
                    toast.success("Saldo de almoxarifado atualizado.");
                  }}
                >
                  Salvar Saldo
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-2xs font-mono ${
        accent
          ? "border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-300 font-bold"
          : "border-border/70 bg-background/60 text-foreground"
      }`}
    >
      {icon}
      <span className="text-muted-foreground font-sans">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

function YieldCalculatorBody({
  item,
  onApply,
}: {
  item: BomItem;
  onApply: (patch: Partial<BomItem>) => void;
}) {
  const [largura, setLargura] = useState(String(item.larguraM ?? 1.8));
  const [gramatura, setGramatura] = useState(String(item.gramaturaGm2 ?? 150));
  const [consumoM, setConsumoM] = useState("0.88");

  const largNum = parseDecimalPtBr(largura);
  const gramNum = parseDecimalPtBr(gramatura);
  const rend = calcRendimentoMporKg(largNum, gramNum);
  const mNum = parseDecimalPtBr(consumoM);
  const kgCalc = converterMetroParaKg(mNum, largNum, gramNum);
  const mFromCurrentKg = converterKgParaMetro(parseDecimalPtBr(item.consumo), largNum, gramNum);

  return (
    <div className="space-y-3 py-1 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Largura Útil do Rolo (m)</Label>
          <Input
            value={largura}
            onChange={(e) => setLargura(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Gramatura (g/m²)</Label>
          <Input
            value={gramatura}
            onChange={(e) => setGramatura(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-teal-500/35 bg-teal-500/10 p-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rendimento Linear (m/kg):</span>
          <strong className="font-mono text-teal-700 dark:text-teal-300">
            {rend.toFixed(3)} m/kg
          </strong>
        </div>
        {item.unidade.toLowerCase() === "kg" && mFromCurrentKg > 0 && (
          <div className="flex justify-between text-2xs">
            <span className="text-muted-foreground">
              Consumo atual ({item.consumo} kg) equivale a:
            </span>
            <span className="font-mono">{mFromCurrentKg.toFixed(3)} m lineares</span>
          </div>
        )}
      </div>

      <div className="space-y-1 pt-1 border-t border-border/60">
        <Label className="text-xs">Converter comprimento do risco (m/peça → kg/peça)</Label>
        <div className="flex items-center gap-2">
          <Input
            value={consumoM}
            onChange={(e) => setConsumoM(e.target.value)}
            className="font-mono text-xs"
          />
          <span className="text-muted-foreground">m =</span>
          <span className="font-mono font-bold text-foreground whitespace-nowrap">
            {kgCalc.toFixed(4)} kg
          </span>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply({ larguraM: largNum, gramaturaGm2: gramNum })}
        >
          Salvar Apenas Rendimento
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onApply({
              larguraM: largNum,
              gramaturaGm2: gramNum,
              consumo: String(kgCalc),
              unidade: "kg",
            })
          }
        >
          Aplicar {kgCalc.toFixed(3)} kg na Linha
        </Button>
      </DialogFooter>
    </div>
  );
}
