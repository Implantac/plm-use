import { useEffect, useMemo, useState } from "react";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  FileText,
  Landmark,
  Target,
  Wallet,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildDrePrintableHtml, computeCollectionDreSummary } from "@/lib/techsheet/cfo-dre";
import { DataProvenanceBadge } from "@/components/common/DataProvenanceBadge";
import { useTechSheetStore } from "@/lib/techsheet/store";

export const Route = createFileRoute("/_authenticated/financial")({
  component: FinancialPage,
});

const STORAGE_KEY = "use-moda:financial-cfo-v2";

type TransactionSource = "marketing" | "vendas" | "producao" | "estoque" | "outros";
interface FinancialTransaction {
  id: number;
  label: string;
  val: string;
  due: string;
  source: TransactionSource;
}

// Os títulos nascem vazios (Onda 67): os três lançamentos de demonstração
// ("Contas a Receber (B2B) R$ 342k", "Contas a Pagar (Suppliers) R$ 124k",
// "Impostos/Fiscal R$ 42k") davam para ler como fluxo de caixa real da
// empresa. Só lançamento registrado pelo usuário entra no fluxo — mesmo
// contrato dos parceiros (Onda 42) e das coleções (Onda 51).
const DEFAULT_TRANSACTIONS: FinancialTransaction[] = [];

function FinancialPage() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);

  const [fixedOverheadBrl, setFixedOverheadBrl] = useState(85_000);
  const [otbBudgetBrl, setOtbBudgetBrl] = useState(220_000);
  const [otbPanelOpen, setOtbPanelOpen] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(DEFAULT_TRANSACTIONS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          fixedOverheadBrl?: number;
          otbBudgetBrl?: number;
          transactions?: FinancialTransaction[];
        };
        if (typeof parsed.fixedOverheadBrl === "number")
          setFixedOverheadBrl(parsed.fixedOverheadBrl);
        if (typeof parsed.otbBudgetBrl === "number") setOtbBudgetBrl(parsed.otbBudgetBrl);
        if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0)
          setTransactions(parsed.transactions);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fixedOverheadBrl, otbBudgetBrl, transactions }),
      );
    } catch {
      // ignore storage quota
    }
  }, [fixedOverheadBrl, otbBudgetBrl, transactions]);

  const dre = useMemo(
    () => computeCollectionDreSummary(sheetsMap, fixedOverheadBrl, otbBudgetBrl, materializadas),
    [sheetsMap, fixedOverheadBrl, otbBudgetBrl, materializadas],
  );

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  // Sem ficha salva a DRE não é apurável: `—` declarado, nunca R$ 0,00 com
  // cara de apuração e nunca o número do modelo (Onda 30).
  const fmtDre = (v: number) => (dre.apuravel ? fmtBrl(v) : "—");
  const fmtPecasDre = (v: number) => (dre.apuravel ? v.toLocaleString("pt-BR") : "—");
  const fmtPctDre = (v: number) => (dre.apuravel ? v.toFixed(1) : "—");

  const [receber, setReceber] = useState<{ count: number; total: number } | null>(null);
  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("total_value")
        .in("status", ["aprovado", "liberado_pcp"]);
      if (error || !data) return;
      const rows = data as { total_value: string | number }[];
      setReceber({
        count: rows.length,
        total: rows.reduce((a, r) => a + Number(r.total_value || 0), 0),
      });
    })();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    val: "",
    due: "",
    source: "marketing" as TransactionSource,
  });

  const handleOpenDialog = (transaction?: FinancialTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        label: transaction.label,
        val: transaction.val,
        due: transaction.due,
        source: (["marketing", "vendas", "producao", "estoque", "outros"] as const).includes(
          transaction.source,
        )
          ? transaction.source
          : "marketing",
      });
    } else {
      setEditingTransaction(null);
      setFormData({ label: "", val: "", due: "", source: "marketing" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      toast.error("Informe o título do lançamento.");
      return;
    }
    if (editingTransaction) {
      setTransactions(
        transactions.map((t) => (t.id === editingTransaction.id ? { ...t, ...formData } : t)),
      );
      toast.success("Lançamento financeiro atualizado e persistido");
    } else {
      setTransactions([{ id: Date.now(), ...formData }, ...transactions]);
      toast.success("Nova transação registrada e persistida");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id));
    toast.error("Lançamento removido");
  };

  function printDreReport() {
    const html = buildDrePrintableHtml(dre);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para emitir a DRE Gerencial A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const financeStats = [
    {
      label: "Receita Líquida Projetada",
      value: fmtDre(dre.netRevenue),
      change: dre.apuravel
        ? `${dre.totalPieces.toLocaleString("pt-BR")} pçs`
        : dre.origem.semEngenharia.length > 0
          ? "sem engenharia custeada"
          : "sem ficha salva",
      trend: "up" as const,
    },
    {
      label: "Custo Mercadoria (CMV)",
      value: fmtDre(dre.cmvTotal),
      change: `BOM ${fmtDre(dre.cmvMaterial)}`,
      trend: "down" as const,
    },
    {
      label: "Margem de Contribuição",
      value: `${fmtPctDre(dre.contributionMarginPct)}%`,
      change: fmtDre(dre.contributionMarginBrl),
      trend: "up" as const,
    },
    {
      label: "EBITDA Projetado",
      value: fmtDre(dre.ebitdaBrl),
      change: `${fmtPctDre(dre.ebitdaPct)}% s/ Bruta`,
      trend: dre.ebitdaBrl >= 0 ? ("up" as const) : ("down" as const),
    },
  ];

  return (
    <ModuleLayout
      title="Financeiro · DRE Têxtil & OTB"
      subtitle="Apuração integrada às Fichas Técnicas (BOM, BOP e Mark-up Divisor), Ponto de Equilíbrio Operacional e Orçamento Open-To-Buy persistido."
      version="CFO Dashboard v4.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar lançamento, coleção ou centro de custo"
      metrics={[
        { label: "Receita Bruta", value: fmtDre(dre.grossRevenue), detail: "planejada" },
        { label: "CMV Total", value: fmtDre(dre.cmvTotal), detail: "BOM + BOP" },
        {
          label: "Break-Even",
          value: `${fmtPecasDre(dre.breakEvenPieces)} pçs`,
          detail: fmtDre(dre.breakEvenRevenueBrl),
        },
        {
          label: "Saldo OTB",
          value: fmtBrl(dre.otbRemainingBrl),
          detail: dre.otbRemainingBrl >= 0 ? "dentro do teto" : "estouro OTB",
        },
      ]}
    >
      {/* Onda 58: 7 siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos
        siglas={["OTB", "DRE", "BOM", "BOP", "EBITDA", "PV", "Mark-up"]}
        testId="glossario-financial"
      />
      {receber && receber.count > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/[0.06] p-3 text-xs">
          <span className="font-semibold uppercase tracking-[0.04em] text-primary">
            Pedidos Reais Aprovados
          </span>
          <span className="text-muted-foreground">
            A receber nos pedidos do PLM: {receber.count} pedido(s), total {fmtBrl(receber.total)}.
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2.5 mb-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOtbPanelOpen((v) => !v)}
          className="text-xs gap-2"
        >
          <Wallet className="w-4 h-4 text-primary" /> Simulador OTB & Estrutura
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={printDreReport}
          disabled={!dre.apuravel}
          title={dre.apuravel ? undefined : "Salve uma ficha técnica para apurar a DRE"}
          className="text-xs gap-2"
        >
          <FileText className="w-4 h-4" /> DRE Gerencial (A4)
        </Button>
      </div>

      {/* De onde vem a DRE: sem isso os cards parecem operação real. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {dre.origem.apenasReferencia ? (
          <DataProvenanceBadge
            source="demonstracao"
            detail="nenhuma ficha salva — DRE não apurável"
            data-testid="dre-provenance"
          />
        ) : dre.origem.referencias.length > 0 ? (
          <DataProvenanceBadge
            source="parcial"
            detail={`${dre.origem.salvas.length} salva(s) · ${dre.origem.referencias.length} do modelo fora da conta`}
            data-testid="dre-provenance"
          />
        ) : (
          <DataProvenanceBadge
            source="real"
            detail="todas as fichas são salvas"
            data-testid="dre-provenance"
          />
        )}
        {dre.origem.referencias.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            SKUs do modelo excluídos da apuração:{" "}
            <span className="font-mono">{dre.origem.referencias.join(", ")}</span>
          </span>
        )}
        {dre.origem.apenasReferencia && (
          <CtaProximoPasso passo="ficha" label="Criar ficha técnica" testId="cta-dre-sem-ficha" />
        )}
      </div>

      {/* Painel Simulador OTB & Ponto de Equilíbrio */}
      {otbPanelOpen && (
        <Card className="rounded-xl border-border bg-card p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Parâmetros Estruturais CFO · Ponto de Equilíbrio & Orçamento de Compras (OTB)
              </h3>
            </div>
            <Badge
              variant="outline"
              className={
                dre.otbRemainingBrl >= 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-2xs"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-2xs"
              }
            >
              OTB Comprometido:{" "}
              {dre.otbBudgetBrl > 0
                ? ((dre.otbCommittedBrl / dre.otbBudgetBrl) * 100).toFixed(1)
                : 0}
              % ({fmtDre(dre.otbCommittedBrl)} de {fmtBrl(dre.otbBudgetBrl)})
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <Label
                htmlFor="custo-fixo-colecao"
                className="text-2xs uppercase text-muted-foreground block mb-1"
              >
                Custo Fixo da Coleção (R$)
              </Label>
              <Input
                id="custo-fixo-colecao"
                type="number"
                step="5000"
                min="0"
                value={fixedOverheadBrl}
                onChange={(e) => setFixedOverheadBrl(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 font-mono text-xs"
              />
            </div>
            <div>
              <Label
                htmlFor="teto-otb-materia-prima"
                className="text-2xs uppercase text-muted-foreground block mb-1"
              >
                Teto OTB Matéria-Prima (R$)
              </Label>
              <Input
                id="teto-otb-materia-prima"
                type="number"
                step="10000"
                min="10000"
                value={otbBudgetBrl}
                onChange={(e) => setOtbBudgetBrl(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
              <span className="text-2xs uppercase text-muted-foreground block">
                Ponto de Equilíbrio
              </span>
              <strong className="font-mono text-sm text-foreground">
                {fmtPecasDre(dre.breakEvenPieces)} peças
              </strong>
              <span className="text-2xs text-muted-foreground block">
                {fmtDre(dre.breakEvenRevenueBrl)}
              </span>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5">
              <span className="text-2xs uppercase text-primary block">Deduções + Comissões</span>
              <strong className="font-mono text-sm text-primary">
                {fmtDre(dre.taxDeductions + dre.commercialExpenses)}
              </strong>
              <span className="text-2xs text-muted-foreground block">
                Impostos {fmtDre(dre.taxDeductions)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {financeStats.map((stat) => (
          <Card
            key={stat.label}
            className="glass-card rounded-xl p-5 group hover:border-primary/40 transition-all"
          >
            <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </p>
              <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-primary">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <div className="space-y-1.5">
              <p className="text-xl font-bold text-foreground tabular-nums tracking-tight">
                {stat.value}
              </p>
              <div className="flex items-center gap-1.5">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-status-approved" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-2xs font-mono text-muted-foreground">{stat.change}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DRE Analítica + Rentabilidade por SKU */}
        <Card className="lg:col-span-2 glass-card rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> DRE Gerencial da Coleção & Mix de Custo
              por Referência
            </h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Matéria-Prima (BOM)
              </span>
              <span className="flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Mão de Obra (BOP)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-left">Referência</th>
                  <th className="p-2.5 text-right">Tiragem</th>
                  <th className="p-2.5 text-right">PV Unit.</th>
                  <th className="p-2.5 text-right">Receita Bruta</th>
                  <th className="p-2.5 text-right">CMV Total</th>
                  <th className="p-2.5 text-right">MC (%)</th>
                </tr>
              </thead>
              <tbody>
                {!dre.apuravel && (
                  <tr className="border-t border-border/60" data-testid="dre-sem-ficha">
                    <td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">
                      {dre.origem.semEngenharia.length > 0
                        ? `DRE não apurável: ${dre.origem.semEngenharia.length} ficha(s) salva(s) sem BOM custeada, preço ou tiragem declarada (${dre.origem.semEngenharia.join(", ")}). Overhead fixo não vira prejuízo inventado.`
                        : "Nenhuma ficha técnica salva. A DRE não é apurável — os SKUs de demonstração não entram na conta."}{" "}
                      <Link to="/tech-sheet" className="text-primary underline">
                        Abrir Ficha Técnica
                      </Link>
                    </td>
                  </tr>
                )}
                {dre.skus.map((sku) => (
                  <tr key={sku.refCode} className="border-t border-border/60">
                    <td className="p-2.5">
                      <span className="font-mono text-primary mr-1.5">{sku.refCode}</span>
                      <span className="font-medium text-foreground">{sku.refName}</span>
                      {!sku.salva && (
                        <DataProvenanceBadge
                          source="demonstracao"
                          className="ml-2 align-middle"
                          data-testid={`sku-provenance-${sku.refCode}`}
                        />
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono">{sku.tiragem} pçs</td>
                    <td className="p-2.5 text-right font-mono">{fmtBrl(sku.unitPrice)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtBrl(sku.grossRevenue)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtBrl(sku.cmvTotal)}</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {sku.contributionMarginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {dre.skus.slice(0, 4).map((sku) => {
              const totalUnit = Math.max(0.01, sku.unitMaterialCost + sku.unitLaborCost);
              const matPct = Math.round((sku.unitMaterialCost / totalUnit) * 100);
              const labPct = 100 - matPct;
              return (
                <div
                  key={sku.refCode}
                  className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex justify-between text-2xs">
                    <span className="font-mono font-semibold text-foreground">{sku.refCode}</span>
                    <span className="font-mono text-muted-foreground">
                      R$ {totalUnit.toFixed(2)}/pç
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-primary h-full" style={{ width: `${matPct}%` }} />
                    <div className="bg-emerald-500 h-full" style={{ width: `${labPct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    MP {matPct}% · MOD {labPct}%
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
              Títulos & Fluxo em Transação
            </h3>
            {transactions.length === 0 && (
              <div
                data-testid="financial-fluxo-vazio"
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
              >
                <strong className="text-foreground">Nenhum título lançado.</strong> O fluxo de caixa
                nasce vazio — os valores de demonstração não são apurados como reais. O PLM não é
                ERP: lance o título real para compor o fluxo.
              </div>
            )}
            <div className="space-y-2.5">
              {transactions.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg bg-muted/40 border border-border/60 hover:border-primary/30 transition-all group relative"
                >
                  <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ModuleActionMenu
                      onEdit={() => handleOpenDialog(item)}
                      onDelete={() => handleDelete(item.id)}
                      // Onda 75: "Visualizar" só mostrava toast com os dados do
                      // item — promessa sem ação. O card já exibe o item; sai do menu.
                    />
                  </div>
                  <div className="flex justify-between items-center mb-1 pr-6">
                    <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                    <p className="text-xs font-bold font-mono text-foreground shrink-0">
                      {item.val}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-2xs text-muted-foreground uppercase tracking-wider">
                      Vencimento em {item.due} · {item.source}
                    </p>
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card rounded-xl p-5 bg-gradient-to-br from-status-approved/10 to-transparent border-status-approved/25">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-status-approved/20 text-status-approved">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">
                  Saúde Operacional da Coleção
                </h3>
                <p className="text-2xs text-status-approved font-semibold uppercase tracking-widest">
                  {!dre.apuravel
                    ? "DRE não apurável"
                    : dre.ebitdaBrl >= 0
                      ? "Superavitária"
                      : "Atenção ao Custo Fixo"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O ponto de equilíbrio é atingido com{" "}
              <strong className="text-foreground">{fmtPecasDre(dre.breakEvenPieces)} peças</strong>{" "}
              (
              {dre.apuravel
                ? ((dre.breakEvenPieces / Math.max(1, dre.totalPieces)) * 100).toFixed(0)
                : "—"}
              % da tiragem planejada).
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-2xs uppercase text-muted-foreground">Título / Categoria</Label>
              <Input
                aria-label="Título / Categoria"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ex: Contas a Pagar Tecelagem"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-2xs uppercase text-muted-foreground">Fonte</Label>
                <select
                  aria-label="Fonte"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value as TransactionSource })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="producao">Produção / Insumos</option>
                  <option value="vendas">Vendas B2B</option>
                  <option value="marketing">Marketing</option>
                  <option value="estoque">Estoque</option>
                  <option value="outros">Impostos / Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-2xs uppercase text-muted-foreground">Valor</Label>
                <Input
                  aria-label="Valor"
                  value={formData.val}
                  onChange={(e) => setFormData({ ...formData, val: e.target.value })}
                  placeholder="Ex: R$ 15.000"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-2xs uppercase text-muted-foreground">Vencimento</Label>
                <Input
                  aria-label="Vencimento"
                  value={formData.due}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                  placeholder="Ex: 28 DDL"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Efetivar Lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
